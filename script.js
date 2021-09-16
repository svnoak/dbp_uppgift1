/*
------------     
    TODO
------------

- [ ] Updating DB... on remove/add
- [ ] Updating Users... every 30 seconds
- [ ] Updating favourites.compare() on remove/add
- [ ] Clicking on users and rendering correct images (but without buttons)
- [ ] Green borders on favourite images

*/


const userId = 14;

initialize();

function updateFeedback(){

}

async function initialize(){
    let users = await getUsers();
    const sidebar = await createSidebar("nav", users);
    const main = await createMain("main", users);
    render(sidebar);
    render(main);

    function render(element){
        document.body.appendChild(element);
    }
}

async function createSidebar(element, users){
    let container = document.createElement(element);
    users.sort( (a,b) => a.alias > b.alias );
    users.sort( (a,b) => a.id == userId ? -1 : b.id == userId ? 1 : 0);

    for( user of users) {
        let element = document.createElement("div");
        element.innerText = await favourites.updateUserFavs(users, user, element);
        element.id = `nav_${user.id}`;
        container.append(element);
    };

    return container;
}

async function createMain(element, users){
    const images = await getArtWorks();
    const container = document.createElement(element);
    for( image of images) {

        let imageID = image.objectID;
        let exists = await favourites.exists(imageID, users);

        let div = document.createElement("div");
        if (exists) div.style.border = "10px green";
        let button = document.createElement("button");
        button.innerText = exists ? "remove" : "add";
        button.value = await favourites.exists(imageID, users);
        button.id = `b_${image.objectID}`;
        button.addEventListener( "click", () => {
            favourites.operation(imageID, users)
        });

        let imageElement = document.createElement("img");
        imageElement.src = image.primaryImageSmall;
        imageElement.id = image.objectID;

        div.append(button, imageElement);
        container.append(div);
    };

    return container;
}

const favourites = {
    compare: async function (users, user){

        const mainUser = users.find( user => user.id == userId );
        const mainFavs = mainUser.favs;
        let commonFavs = user.favs.filter( userFav => mainFavs.some( mainFav => mainFav == userFav ) );
        return commonFavs.length;
    },
    operation: async function(imageID){ // operation = removeFav || addFav
        let users = await getUsers();
        let exists = await favourites.exists(imageID, users);
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
                    btn.value = exists ? false : true;
                    btn.innerText = exists ? "add" : "remove";
                }
                if (response.status == 409 ) {              
                    btn.innerText = "Too many favourites";
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerText = "add";
                        btn.disabled = false;
                    }, 2000);
                }
                this.updateUserFavs(users);
                console.log(response);
                document.body.style.backgroundColor = "white";
            })
            .catch( console.log )
    },
    exists: async function(imageID, users){
        const favs = users.find( user => user.id == userId).favs;
        const exists = favs.some( fav => fav == imageID );
        return exists;
    },
    updateUserFavs: async function(users, user, element){
        if ( !element ){
            users = await getUsers();
            for (user of users) {
                let userElement = document.querySelector(`#nav_${user.id}`);
                let commonFavs = await favourites.compare(users, user);
                userElement.innerText = `${user.alias} [${user.favs.length}] (${commonFavs})`;
            }
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

