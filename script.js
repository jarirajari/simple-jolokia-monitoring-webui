$(document).ready(function () {
    console.log("ready!");
    // clear or populate local storage
    clearLocalStorage();
    window.chart = Highcharts.stockChart('charts', {
        title: {
            text: 'Monitors'
        },
        series: []
    });

});

const data = {};

function fieldIdGenerator(key) {
    return `jolokiaMonitorURL_${key}`
}

function isValidUrl(url) {
    // Regular expression for a simple URL validation
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;

    // Test if the provided URL matches the regular expression
    return urlRegex.test(url);
}

function newInputField(key, value) {
    const fieldId = key;
    const toggleId = `toggle_${key}`;
    const template = `
    
<div class="input-group">
<div class="form-check form-switch" >
<input class="form-check-input" style="position: absolute; top: 20%;" id="${toggleId}" type="checkbox" role="switch" onclick="toggle('${fieldId}')" checked>
</div>
    <label class="col-sm-3 col-form-label" for="${fieldId}">${fieldId}</label>
    <input type="text" class="form-control" id="${fieldId}" readonly="true" value="${value}"/>
    
    <span class="input-group-btn">
        <button class="btn btn-default" type="button" onclick="remove('${key}')"><i
                class="bi bi-dash-circle"></i></button>
    </span>
</div>
`
    return template;
}

function toggle(checkboxId) {
    const toggleId = `#toggle_${checkboxId}`;
    const checked = $(toggleId).is(':checked');
    const chartIndex = findSeriesIndexByName(checkboxId) ;
    if (chartIndex >= 0) {
        window.chart.series[chartIndex].setVisible(checked);
    }
    //console.log(checkboxId, chartIndex, checked);
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
        insertNewSeriesToChart(key);
        console.log("+", inputValue);
    } else {
        console.log("Invalid URL!");
    }
}

function remove(key) {
    removeLocalStorage(key);
    removeOldSeriesFromChart(key);
    removeDataSeries(key);
    $(`#${key}`).parent().remove();
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
    const key = fieldIdGenerator(globalIndex++);
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

async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function makeConcurrentRequests() {
    const matchedInputs = $('input[id^="jolokiaMonitorURL_"]');
    const requests = new Map();

    matchedInputs.each(function () {
        const inputValue = $(this).val();
        const idKey = $(this).attr('id');
        const request = fetchData(inputValue);
        requests.set(idKey, request);
    });

    try {
        // Wait for all promises to resolve
        await Promise.all(requests.values());

        // Access results using the input values as keys
        requests.forEach((request, inputId) => {
            request.then(response => {
                //console.log(`Result for ${inputId}:`, response);
                // Direct JMX jolokia => get data from response.value
                let expectedFormatValue = response.value || null;
                if (expectedFormatValue) {
                    let time = Date.now() / 1000 * 1000;
                    series = findDataSeries(inputId);
                    series.push([time, expectedFormatValue]);
                    if (window.chart) {
                        let seriesIndex = findSeriesIndexByName(inputId);
                        window.chart.series[seriesIndex].setData(series, true);
                    }
                }
                //console.log(data, inputId, series)
            })
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function monitor() {
    await makeConcurrentRequests();
}

var controller = new AbortController();
controller.abort();
interval = 0;

function play() {
    const secs = parseInt($('#schedulerInterval').val()) || 10;
    // Low accuracy: setInterval(() => monitor(), 1000 * interval);
    interval = 1000 * secs;
    if (controller.signal.aborted === true) {
        controller = new AbortController();
        accurateInterval(interval, controller.signal, time => {
            monitor();
        });
        toast("Monitoring started!");
    }
}

function stop() {
    controller.abort();
    toast("Monitoring stopped!");
}

function reset() {
    Object.keys(data).forEach(key => {
        data[key] = [];
    });
    window.chart.series.forEach(series => {
        series.setData([], true, false);
    });
    window.chart.redraw();
    toast("Reset!");
}

// from: https://stackoverflow.com/a/66011886
function accurateInterval(ms, signal, callback) {
    const start = document.timeline.currentTime;

    function frame(time) {
        if (signal.aborted) return;
        callback(time);
        scheduleFrame(time);
    }

    function scheduleFrame(time) {
        const elapsed = time - start;
        const roundedElapsed = Math.round(elapsed / ms) * ms;
        const targetNext = start + roundedElapsed + ms;
        const delay = targetNext - performance.now();
        setTimeout(() => requestAnimationFrame(frame), delay);
    }

    scheduleFrame(start);
}

function findSeriesIndexByName(seriesName) {
    for (var i = 0; i < window.chart.series.length; i++) {
        if (window.chart.series[i].name === seriesName) {
            return i;
        }
    }
    console.error('Did not find series', seriesName);
    return undefined;
}

function insertNewSeriesToChart(seriesName) {
    window.chart.addSeries({
        name: seriesName,
        data: []
    });
}

function removeOldSeriesFromChart(seriesName) {
    var seriesIndex = findSeriesIndexByName(seriesName);

    if (seriesIndex !== -1) {
        window.chart.series[seriesIndex].remove();
    }
}

function toast(msg) {
    window.Toastify({
        text: msg,
        gravity: "top",
        position: 'center',
        style: {
            color: '#ffffff',
            background: '#000000'
        },
        onClick: function () { } // Callback after click
    }).showToast();
}

