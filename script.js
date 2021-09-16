const userId = 14;

async function initialize(){
    const sidebar = await createSidebar("nav");
    render(sidebar);

    function render(element){
        document.body.appendChild(element);
    }
}

async function createSidebar(element){
    const users = await getUsers();
    let container = document.createElement(element);
    users.sort( (a,b) => a.alias > b.alias );
    users.sort( (a,b) => a.id == userId ? -1 : b.id == userId ? 1 : 0);

    users.forEach( user => {
        let element = document.createElement("div");
        element.innerText = `${user.alias} [${user.favs.length}] (/compareFavourites(user.favs)})`;
        container.append(element);
    } )

    return container;
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

    // CHECK LOCALSTORAGE

    const artFetches = [];
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";
    const artIDs = await artIDsArray();
    
    for( id of artIDs ) artFetches.push(fetch(url + id));
    const responsePromises = await Promise.all(artFetches);
    const arrayOfJSON = responsePromises.map( response => response.json() );
    const arrayOfData = await Promise.all(arrayOfJSON);

    return arrayOfData;

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

function createImages(images){
    const container = document.createElement("div");
    images.forEach( image => {
        let imageElement = document.createElement("img");
        imageElement.src = image.primaryImageSmall;
        container.append(imageElement);
    } );

    return container;
}

function filterObjectKeys(object, keysToKeep){
    let objectKeys = Object.keys(object);
    const clonedObject = JSON.parse(JSON.stringify(object));
    let filteredKeys = objectKeys.filter( objectKey => !keysToKeep.some( key => objectKey == key ) );
    for ( key of filteredKeys ) delete clonedObject[key];
    return clonedObject;
}

