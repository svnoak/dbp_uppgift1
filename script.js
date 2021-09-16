const userId = 14;

async function initialize(){
    const sidebar = await createSidebar("nav");
    const main = await createMain("main");
    render(sidebar);
    render(main);

    function render(element){
        document.body.appendChild(element);
    }
}

async function createSidebar(element){
    const users = await getUsers();
    let container = document.createElement(element);
    users.sort( (a,b) => a.alias > b.alias );
    users.sort( (a,b) => a.id == userId ? -1 : b.id == userId ? 1 : 0);

    for( user of users) {
        let element = document.createElement("div");
        let commonFavs = await compareFavourites(users, user.favs);
        element.innerText = `${user.alias} [${user.favs.length}] (${commonFavs})`;
        container.append(element);
    };

    return container;
}

async function createMain(element){
    const images = await getArtWorks();
    const container = document.createElement(element);
    for( image of images) {
        let div = document.createElement("div");
        let button = document.createElement("button");
        button.innerText = favExists() ? "remove" : "add";
        let imageElement = document.createElement("img");
        imageElement.src = image.primaryImageSmall;
        div.append(button, imageElement);
        container.append(div);
    };

    return container;

    function favExists(){
        return false;
    }
}

async function compareFavourites(users, userFavs){
    const mainUser = users.find( user => user.id == userId );
    const mainFavs = mainUser.favs;

    let commonFavs = userFavs.filter( userFav => mainFavs.some( mainFav => mainFav == userFav ) );
    return commonFavs.length;
}

initialize();

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

