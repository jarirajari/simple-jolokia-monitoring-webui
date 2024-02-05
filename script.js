$(document).ready(function () {
    console.log("ready!");
    // clear or populate local storage
    clearLocalStorage();
});

const data = {};

function fieldIdGenerator(key) {
    return `jolokiaInput_${key}`
}

function isValidUrl(url) {
    // Regular expression for a simple URL validation
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;

    // Test if the provided URL matches the regular expression
    return urlRegex.test(url);
}

function newInputField(key, value) {
    const fieldId = fieldIdGenerator(key);
    const template = `
<div class="input-group">
    <input type="text" class="form-control" id="${fieldId}" readonly="true" value="${value}"/>
    <span class="input-group-btn">
        <button class="btn btn-default" type="button" onclick="remove('${key}')"><i
                class="bi bi-dash-circle"></i></button>
    </span>
</div>
`
    return template;
}

function insert() {
    // Get the value from the input field
    const inputValue = $('#jolokiaInput').val();
    if (isValidUrl(inputValue)) {
        const key = insertLocalStorage(inputValue);
        const newInput = $(newInputField(key, inputValue));
        $('#jolokies').append(newInput);
        $('#jolokiaInput').val('');
        insertDataSeries(key);
        console.log("+", inputValue);
    } else {
        console.log("Invalid URL!");
    }
}

function remove(key) {
    const fieldId = fieldIdGenerator(key);
    removeLocalStorage(key);
    removeDataSeries(key);
    $(`#${fieldId}`).parent().remove();
    removeDataSeries(key);
    console.log("- @", key);
}

const storageName = "jolokies";

function populate() {
    console.log("Not implemented yet!");
}

function clearLocalStorage() {
    localStorage.clear();
}

var globalIndex = 1;

function insertLocalStorage(value) {
    const key = `jf_${globalIndex++}`;
    // Retrieve the existing Map from local storage or create a new one
    const existingMap = getMapFromLocalStorage();

    // Insert the new key-value pair
    existingMap.set(key, value);

    // Save the updated Map back to local storage
    setMapToLocalStorage(existingMap);

    return key;
}

function removeLocalStorage(key) {
    // Retrieve the existing Map from local storage
    const existingMap = getMapFromLocalStorage();

    // Check if the key exists in the Map
    if (existingMap.has(key)) {
        // Remove the item with the specified key
        existingMap.delete(key);

        // Save the updated Map back to local storage
        setMapToLocalStorage(existingMap);

        return key;
    }

    return null;
}

// Function to set a Map in local storage
function setMapToLocalStorage(map) {
    const serializedMap = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem('myMapKey', serializedMap);
}

// Function to get a Map from local storage
function getMapFromLocalStorage() {
    const serializedMap = localStorage.getItem('myMapKey');
    if (serializedMap) {
        const deserializedArray = JSON.parse(serializedMap);
        return new Map(deserializedArray);
    }
    return new Map();
}

function insertDataSeries(name) {
    // Create a new object with the provided name and array of numbers
    const newDataObject = { [name]: [] };

    // Insert the new object into the data object
    Object.assign(data, newDataObject);
}

function findDataSeries(name) {
    return data[name] || null;
}

function removeDataSeries(name) {
    // Check if the object with the specified name exists in the data object
    if (data.hasOwnProperty(name)) {
        // Remove the object with the specified name
        delete data[name];
    }
}
