/*
------------     
    TODO
------------

- [x] Updating DB... on remove/add
- [x] Updating Users... every 30 seconds
- [x] Updating favourites.compare() on remove/add
- [x] Green borders on favourite images
- [ ] Clicking on users and rendering correct images (but without buttons)
- [ ] Navigation separate scrolling

*/


const userId = 14;

initialize();

async function initialize(){
    let users = await getUsers();
    const sidebar = await createSidebar("nav", users);
    const main = await createMain("main", users, userId);
    render(sidebar);
    render(main);

}

function render(element){
    document.body.appendChild(element);
}

async function createSidebar(element, users){
    let container = document.createElement(element);
    users.sort( (a,b) => a.alias > b.alias );
    users.sort( (a,b) => a.id == userId ? -1 : b.id == userId ? 1 : 0);

    let overlay = document.createElement("div");
    overlay.id = "nav_overlay";
    overlay.innerText = "Updating Users..."
    overlay.className = "hidden update_overlay";

    container.append(overlay);

    for( user of users) {
        let element = document.createElement("div");
        element.innerText = await favourites.updateUserFavs(users, user, element);
        if (user.id == userId) element.innerText = `${user.alias} [${user.favs.length}]`;
        let userid = user.id;
        element.id = `nav_${user.id}`;
        element.addEventListener("click", () => favourites.renderUserFav(users, userid));
        container.append(element);
    };

    return container;
}

async function createMain(element, users, id){
    const images = await getArtWorks();
    const container = document.createElement(element);

    for( image of images) {

        let imageContainer = document.createElement("div");

        let imageID = image.objectID;
        let exists = await favourites.exists(imageID, users, id);

        let div = document.createElement("div");
        div.id = `d_${imageID}`;
        if (exists) div.classList.add("fav");

        let overlay = document.createElement("div");
        overlay.id = `overlay_${imageID}`;
        overlay.className = "hidden update_overlay";
        overlay.innerText = "Updating DB...";

        div.append(overlay);

        if( id == userId ){
            let button = document.createElement("button");
            button.innerText = exists ? "remove" : "add";
            button.value = await favourites.exists(imageID, users, id);
            button.id = `b_${image.objectID}`;
            button.addEventListener( "click", () => {
                favourites.operation(imageID, users)
            });
            div.append(button);
        }

        let imageElement = document.createElement("img");
        imageElement.src = image.primaryImageSmall;
        imageElement.id = image.objectID;

        let description = document.createElement("span");
        description.innerText = `${image.title} ${image.artistDisplayName}`;

        div.append(imageElement);

        imageContainer.append(div, description)
        container.append(imageContainer);
    };

    return container;
}

const favourites = {
    renderUserFav: async function(users, id){
        document.querySelector("main").remove();
        const main = await createMain("main", users, id);
        render(main);
    },
    compare: async function (users, user){

        const mainUser = users.find( user => user.id == userId );
        const mainFavs = mainUser.favs;
        let commonFavs = user.favs.filter( userFav => mainFavs.some( mainFav => mainFav == userFav ) );
        return commonFavs.length;
    },
    operation: async function(imageID){ // operation = removeFav || addFav
        let imageDiv = document.querySelector(`#d_${imageID}`);
        document.querySelector(`#overlay_${imageID}`).classList.remove("hidden");
        let users = await getUsers();
        let exists = await favourites.exists(imageID, users, userId);
        if (!exists) imageDiv.classList.add("fav");
        if (exists) imageDiv.classList.remove("fav");
        let operation = exists ? "removeFav" : "addFav";
        const url = "http://mpp.erikpineiro.se/dbp/sameTaste/users.php";
        imageID = parseInt(imageID);
        let object = {id: userId, [operation]: imageID };
        await fetch( new Request(url),
            {
                method: 'PATCH',
                body: JSON.stringify(object),
                headers: {
                "Content-type": "application/json; charset=UTF-8",
                }
            })
            .then(response => {
                let btn = document.querySelector(`#b_${imageID}`);
                if ( response.status == 200 ) {
                    async function update(){ 
                        await favourites.updateUserFavs(users);
                        btn.value = exists ? false : true;
                        btn.innerText = exists ? "add" : "remove";
                        document.querySelector(`#overlay_${imageID}`).classList.add("hidden");
                    }
                    update();
                }
                if (response.status == 409 ) {    
                    document.querySelector(`#overlay_${imageID}`).classList.add("hidden");          
                    btn.innerText = "Too many favourites";
                    btn.disabled = true;
                    btn.style.color = "black";
                    setTimeout(() => {
                        btn.innerText = "add";
                        btn.disabled = false;
                    }, 2000);
                }
            })
            .catch( console.log );
    },
    exists: async function(imageID, users, id){
        const favs = users.find( user => user.id == id).favs;
        const exists = favs.some( fav => fav == imageID );
        return exists;
    },
    updateUserFavs: async function(users, user, element){

        let interval = users ? false : true;
        if ( !element ){
            if (interval) document.querySelector("#nav_overlay").classList.remove("hidden");
            users = await getUsers();
            for (user of users) {
                let userElement = document.querySelector(`#nav_${user.id}`);
                let commonFavs = await favourites.compare(users, user);
                let text = user.id == userId ? `${user.alias} [${user.favs.length}]` : `${user.alias} [${user.favs.length}] (${commonFavs})`;
                userElement.innerText = text;
            }
            if(interval)document.querySelector("#nav_overlay").classList.add("hidden");
        } else {
            let commonFavs = await favourites.compare(users, user);
            return `${user.alias} [${user.favs.length}] (${commonFavs})`;
        }
    }

}

// Returns array of IDs for all artworks
async function artIDsArray(){
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=11&q=snow";
    const rqst = new Request(url);
    const responsePromise = await fetch(rqst);
    const data = await responsePromise.json();
    return data.objectIDs;
}

async function getArtWorks(){
    if ( artInLS() ) return JSON.parse(localStorage.getItem("art"));

    const artFetches = [];
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";
    const artIDs = await artIDsArray();
    
    for( id of artIDs ) artFetches.push(fetch(url + id));
    const responsePromises = await Promise.all(artFetches);
    const arrayOfJSON = responsePromises.map( response => response.json() );
    const arrayOfData = await Promise.all(arrayOfJSON);

    localStorage.setItem("art", JSON.stringify(arrayOfData));

    return arrayOfData;

    function artInLS(){
        return localStorage.getItem("art")
    }
}

async function getUsers(){
    const url = "http://mpp.erikpineiro.se/dbp/sameTaste/users.php";
    const options = {
        method: 'GET',
        headers: {
           "Content-type": "application/json; charset=UTF-8",
        },
     };
    const rqst = new Request(url);
    const responsePromise = await fetch(rqst, options);
    const data = await responsePromise.json();
    return data.message; //returns an array
}

function filterObjectKeys(object, keysToKeep){
    let objectKeys = Object.keys(object);
    const clonedObject = JSON.parse(JSON.stringify(object));
    let filteredKeys = objectKeys.filter( objectKey => !keysToKeep.some( key => objectKey == key ) );
    for ( key of filteredKeys ) delete clonedObject[key];
    return clonedObject;
}

setInterval( () => favourites.updateUserFavs(), 5000 )

