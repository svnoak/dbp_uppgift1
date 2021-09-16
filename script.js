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

async function getArtWork(){
    const artFetches = [];
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";
    const artIDs = await artIDsArray();
    
    for( id of artIDs ) artFetches.push(fetch(url + id));
    const responsePromises = await Promise.all(artFetches);
    const arrayOfJSON = responsePromises.map( response => response.json() );
    const arrayOfData = await Promise.all(arrayOfJSON);
    const keysToKeep = [
        "objectID", 
        "primaryImageSmall",
        "title",
        "artistDisplayName"    
    ]

    const filteredArrayOfData = [];
    arrayOfData.forEach( data => filteredArrayOfData.push(filterObjectKeys(data, keysToKeep)));
    console.log(filteredArrayOfData);

}

function filterObjectKeys(object, keysToKeep){
    let objectKeys = Object.keys(object);
    const clonedObject = JSON.parse(JSON.stringify(object));
    let filteredKeys = objectKeys.filter( objectKey => !keysToKeep.some( key => objectKey == key ) );
    for ( key of filteredKeys ) delete clonedObject[key];
    return clonedObject;
}
getArtWork();