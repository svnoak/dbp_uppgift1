const atesterId = 666;
const userId = 14;


// Returns array of IDs for all artworks
async function artIDsArray(){
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=11&q=snow";
    const rqst = new Request(url);
    const responsePromise = await fetch(rqst);
    const data = await responsePromise.json();
    return data.objectIDs;
}

async function getArtWorks(){
    const artFetches = [];
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";
    const artIDs = await artIDsArray();
    
    for( id of artIDs ) artFetches.push(fetch(url + id));
    const responsePromises = await Promise.all(artFetches);
    const arrayOfJSON = responsePromises.map( response => response.json() );
    const arrayOfData = await Promise.all(arrayOfJSON);

    return arrayOfData;

}

async function render(parent,arrayOfImageObjects){
    const images = await arrayOfImageObjects;
    document.querySelector(parent).append(createImages(images));
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

function initialize(){
    render("nav", getUsers());
    render("main",getArtWorks());
}


function filterObjectKeys(object, keysToKeep){
    let objectKeys = Object.keys(object);
    const clonedObject = JSON.parse(JSON.stringify(object));
    let filteredKeys = objectKeys.filter( objectKey => !keysToKeep.some( key => objectKey == key ) );
    for ( key of filteredKeys ) delete clonedObject[key];
    return clonedObject;
}

