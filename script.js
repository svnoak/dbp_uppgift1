const userId = 14;

initialize();

async function initialize(){
    render("aside", createOverlay("aside", "Updating Users..."));
    render("main", createOverlay("main", "Fetching images..."));
    overlay(true, ["aside", "main"]);
    localStorage.setItem("users", JSON.stringify(await getUsers() ));
    let users = JSON.parse(localStorage.getItem("users"));
    const sidebar = await createSidebar("ul", users);
    const main = await createMain("div", users, userId);
    overlay(false, ["aside", "main"]);
    render("aside", sidebar);
    render("main", main);
}

function overlay(state, overlays){
        let operation = state ? "remove" : "add";
        overlays.forEach( overlay => document.querySelector(`#${overlay}_overlay`).classList[operation]("hidden") );
}

function render(parent, child){
    document.querySelector(parent).appendChild(child);
}

function createOverlay(id, string){
    let overlay = document.createElement("div");
    overlay.id = `${id}_overlay`;
    overlay.innerText = string;
    overlay.className = "hidden update_overlay";

    return overlay;
};

async function createSidebar(element, users){
    //let aside = document.createElement(element);
    let container = document.createElement(element);
    container.id = "aside_container";
    container.className = "menu-list";
    users.sort( (a,b) => a.alias > b.alias );
    users.sort( (a,b) => a.id == userId ? -1 : b.id == userId ? 1 : 0);

    for( user of users) {
        let listItem = document.createElement("li");
        let element = document.createElement("a");
        element.innerText = await favourites.updateUserFavs(users, user, element);
        if (user.id == userId) element.innerText = `${user.alias} [${user.favs.length}]`;
        let userid = user.id;
        element.id = `aside_${user.id}`;
        if ( user.id == userId ) element.className = "is-active";
        element.addEventListener("click", function(){
            if ( document.querySelector(".is-active") ) document.querySelector(".is-active").classList.remove("is-active");
            favourites.renderUserFav(userid);
            this.classList.add("is-active");
        });
        listItem.append(element);
        container.append(listItem);
    };
    return container;
}

async function createMain(element, users, id){
    const images = await getArtWorks();
    const container = document.createElement("div");
    container.id = "main_container";
    container.class = "box";

    for( image of images) {
        let imageID = image.objectID;
        let exists = await favourites.exists(imageID, users, id);
        if( id == userId ){
            createImages(image, imageID, users, id);
        } else {
            if( exists ){
                createImages(image, imageID, users, id);
            }
        }

async function createImages(image, imageID, users, id){
    let imageContainer = document.createElement("div");
    imageContainer.className = "box";
    imageContainer.id = `d_${imageID}`;
    let commonFav = await favourites.exists(imageID, users, userId);

    let div = document.createElement("div");
    if (exists) imageContainer.classList.add("fav");
    if (commonFav && id != userId) imageContainer.style.backgroundColor = "rgba(251, 0, 0, 0.2)";

    let overlay = document.createElement("div");
    overlay.id = `overlay_${imageID}`;
    overlay.className = "hidden update_overlay";
    overlay.innerText = "Updating DB...";

    imageContainer.append(overlay);
    if ( id == userId ){
        let button = document.createElement("button");
        button.innerText = exists ? "remove" : "add";
        button.value = await favourites.exists(imageID, users, id);
        button.id = `b_${image.objectID}`;
        button.className = "button";
        button.addEventListener( "click", () => {
            favourites.operation(imageID, users)
        });
        div.append(button);
    }

    let imageElement = document.createElement("img");
    imageElement.src = image.primaryImageSmall;
    imageElement.id = image.objectID;

    let description = document.createElement("p");
    description.innerText = `${image.title} by ${image.artistDisplayName}`;

    div.append(imageElement);
    imageContainer.append(div, description)
    container.append(imageContainer);
}
    };

    return container;
}

const favourites = {
    renderUserFav: async function(id){
        let users = JSON.parse(localStorage.getItem("users"));
        document.querySelector("#main_container").remove();
        const main = await createMain("div", users, id);
        render("main", main);
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
                    imageDiv.classList.remove("fav");
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
    },
    exists: async function(imageID, users, id){
        const favs = users.find( user => user.id == id).favs;
        const exists = favs.some( fav => fav == imageID );
        return exists;
    },
    updateUserFavs: async function(users, user, element){
        let interval = users ? false : true;
        if ( !element ){
            if (interval) overlay(true, ["aside"]);
            localStorage.setItem("users", JSON.stringify(await getUsers()));
            users = JSON.parse(localStorage.getItem("users"));
            let id = user.split("_")[1];
            this.renderUserFav(id);
            for (user of users) {
                let userElement = document.querySelector(`#aside_${user.id}`);
                let commonFavs = await favourites.compare(users, user);
                let text = user.id == userId ? `${user.alias} [${user.favs.length}]` : `${user.alias} [${user.favs.length}] (${commonFavs})`;
                userElement.innerText = text;
            }
            if(interval) overlay(false, ["aside"]);
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

    keysToKeep = ["objectID", "primaryImageSmall", "title", "artistDisplayName"]

    const sortedArtWorks = arrayOfData.sort( (a,b) => a.artistDisplayName > b.artistDisplayName );
    sortedArtWorks.forEach( item => Object.keys(item).forEach( key => keysToKeep.includes(key) ? 0 : delete item[key]) );

    localStorage.setItem("art", JSON.stringify(arrayOfData));

    return sortedArtWorks;

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
    try{
        const responsePromise = await fetch(rqst, options);
        const data = await responsePromise.json();
        return data.message; //returns an array
    }
    catch (e) {
        alert(`${e} \n\n This might be because of your browser blocking mixed content. \n\n To disable mixed content blocking on Firefox, check out this link \n\n https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox `);
    }
}

setInterval( () => favourites.updateUserFavs(
    "",
    document.querySelector(".is-active").id
), 30000 )
