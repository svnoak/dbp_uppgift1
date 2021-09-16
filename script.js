const userId = 14;

async function initialize(){
    const users = await getUsers();
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
        let commonFavs = await favourites.compare(users, user.favs);
        element.innerText = `${user.alias} [${user.favs.length}] (${commonFavs})`;
        container.append(element);
    };

    return container;
}

async function createMain(element, users){
    const images = await getArtWorks();
    const container = document.createElement(element);
    for( image of images) {

        let exists = await favourites.exists(image.objectID, users);
        let state = exists ? "removeFav" : "addFav";

        let div = document.createElement("div");
        let button = document.createElement("button");
        button.innerText = exists ? "remove" : "add";
        button.value = image.objectID;
        button.id = `b_${image.objectID}`;
        button.addEventListener( "click", () => favourites.operation(state, button.value) );

        let imageElement = document.createElement("img");
        imageElement.src = image.primaryImageSmall;
        imageElement.id = image.objectID;

        div.append(button, imageElement);
        container.append(div);
    };

    return container;
}

const favourites = {
    compare: async function (users, userFavs){
        const mainUser = users.find( user => user.id == userId );
        const mainFavs = mainUser.favs;
    
        let commonFavs = userFavs.filter( userFav => mainFavs.some( mainFav => mainFav == userFav ) );
        return commonFavs.length;
    },
    operation: async function(operation, imageID){ // operation = removeFav || addFav
        const url = "http://mpp.erikpineiro.se/dbp/sameTaste/users.php";
        imageID = parseInt(imageID);
        console.log(operation, imageID);
        await fetch( new Request(url),
            {
                method: 'PATCH',
                body: JSON.stringify({id: userId, [operation]: imageID}),
                headers: {
                "Content-type": "application/json; charset=UTF-8",
                }
            })
            .then(response => {
                if (response.status == 409 ) {                  
                    let btn = document.querySelector(`#b_${imageID}`);
                    btn.innerText = "Too many favourites";
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerText = "add";
                        btn.disabled = false;
                    }, 2000);
                }
            })
            .then(console.log)
    },
    exists: async function(imageID, users){
        const favs = users.find( user => user.id == userId).favs;
        const exists = favs.some( fav => fav == imageID );
        return exists;
    }

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

