function getAllUrlParams(url) {

    // get query string from url (optional) or window
    var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

    // we'll store the parameters here
    var obj = {};

    // if query string exists
    if (queryString) {

        // stuff after # is not part of query string, so get rid of it
        queryString = queryString.split('#')[0];

        // split our query string into its component parts
        var arr = queryString.split('&');

        for (var i = 0; i < arr.length; i++) {
            // separate the keys and the values
            var a = arr[i].split('=');

            // set parameter name and value (use 'true' if empty)
            var paramName = a[0];
            var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];

            // (optional) keep case consistent
            paramName = paramName.toLowerCase();
            if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();

            // if the paramName ends with square brackets, e.g. colors[] or colors[2]
            if (paramName.match(/\[(\d+)?\]$/)) {

                // create key if it doesn't exist
                var key = paramName.replace(/\[(\d+)?\]/, '');
                if (!obj[key]) obj[key] = [];

                // if it's an indexed array e.g. colors[2]
                if (paramName.match(/\[\d+\]$/)) {
                    // get the index value and add the entry at the appropriate position
                    var index = /\[(\d+)\]/.exec(paramName)[1];
                    obj[key][index] = paramValue;
                } else {
                    // otherwise add the value to the end of the array
                    obj[key].push(paramValue);
                }
            } else {
                // we're dealing with a string
                if (!obj[paramName]) {
                    // if it doesn't exist, create property
                    obj[paramName] = paramValue;
                } else if (obj[paramName] && typeof obj[paramName] === 'string') {
                    // if property does exist and it's a string, convert it to an array
                    obj[paramName] = [obj[paramName]];
                    obj[paramName].push(paramValue);
                } else {
                    // otherwise add the property
                    obj[paramName].push(paramValue);
                }
            }
        }
    }

    return obj;
}

function flattenObject(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        if ((typeof ob[i]) == 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;

                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

const audioUrl = location.href.includes("github")
    ? "https://raw.githubusercontent.com/fabiusBile/n-back/master"
    : ".";


const ChallengeType = Object.freeze({
    "Visual": "Visual",
    "Audio": "Audio"
});

const audio = new Audio();

const apiUrl = "https://script.google.com/macros/s/AKfycbwrSN7I4pSb91AIt5QNvmw_JpqovOsL3BqAygBwdPfrupSjlyM/exec";

class ChallengeHandler {
    constructor(type, buttonText, comparer, handler) {
        this.type = type;
        this.comparer = comparer;
        this.handler = handler;

        this.button = new Button(buttonText, type);
    }

    isSuccess(previousCell, currentCell) {
        return this.comparer(previousCell, currentCell);
    }

    handleCell(cell) {
        this.handler(cell);
    }
}

class Button {
    constructor(text, challengeType) {
        this.text = text;
        this.isPressed = ko.observable(false);
        this.isSuccess = ko.observable(false);
        this.challengeType = challengeType;

        var self = this;
        this.cssClass = ko.computed(() => {
            if (self.isPressed()) {
                return self.isSuccess() ? "success" : "failure";
            } else {
                return "";
            }
        });
    }

    press(isSuccess) {
        if (!this.isPressed()) {
            this.isSuccess(isSuccess);
            this.isPressed(true);
        }
    }

    reset() {
        this.isPressed(false);
        this.isSuccess(false);
    }
}

class Cell {
    constructor(position = null, letter = null) {
        this.letter = letter;
        this.position = position;
    }
}

class Grid {
    constructor(horizontalCount, verticalCount, nLevel) {
        this.totalCount = horizontalCount * verticalCount;
        this.horizontalCount = horizontalCount;
        this.verticalCount = verticalCount;
        this.nLevel = ko.observable(nLevel);
        this.previousCells = [];
        this.currentActiveCell = ko.observable(new Cell());
    }

    nextPreviousCell(){
        if (this.nLevel() == 1){
            return this.currentActiveCell();
        }

        if (this.previousCells.length < this.nLevel()){
            return null;
        } 

        return this.previousCells[1];
    }

    previousActiveCell() {
        return this.previousCells.length < this.nLevel()
            ? null
            : this.previousCells[0];
    }



    updateCell(newCell) {
        if (this.previousCells.length >= this.nLevel()) {
            this.previousCells.shift();
        }
        this.previousCells.push(this.currentActiveCell());
        this.currentActiveCell({});
        var self = this;
        setTimeout(() => {
            self.currentActiveCell(newCell);
        }, 500)
    }


}

class ViewModel {

    constructor() {
        this.maxRoundsCount = 21;
        var params = getAllUrlParams();
        this.delayInSeconds = 2 * 1000;
        this.isTestStarted = ko.observable(params.start != undefined);
        this.userName = ko.observable();

        if (params.name) {
            this.userName(decodeURI(params.name));
        }

        this.isVisual = ko.observable(params.visual != undefined);
        this.isAudio = ko.observable(params.audio != undefined);
        var nLevel = Number(params.nlevel) || 1;

        this.grid = new Grid(3, 3, nLevel);
        this.roundsCount = ko.observable(this.maxRoundsCount);
        this.isButtonPressed = false;
        this.handlers = ko.observableArray();
        this.letters = ['а', 'о', 'я', 'г', 'д', 'к', 'л', 'р', 'с', 'т', 'ц', 'м', 'н'];
        this.results = ko.observableArray([]);
        this.detailedResults = ko.observableArray([]);
        var self = this;
        this.finalResult = ko.computed(() => {
            var totalCount = self.results().length;
            var succesCount = self.results().filter(r => r).length;
            var failureCount = self.results().filter(r => !r).length;

            return `Всего: ${totalCount} / Успешно: ${succesCount} / Не успешно: ${failureCount}`;
        })

        if (this.isTestStarted()) {
            this.startTest();
        }

    }

    getDetailedStats(){
        var stats = {};
        var detailedStatsArray = this.detailedResults();
        this.handlers().forEach(h => {
            stats[h.type] = {};
            stats[h.type].total = detailedStatsArray.filter(e => e[h.type] != null && e[h.type].isAppeared).length;
            stats[h.type].error = detailedStatsArray.filter(e => e[h.type] != null && !e[h.type].isSuccess).length
        });
        var self = this;
        stats.All = {};
        stats.All.total = detailedStatsArray.filter(e => {
            var isOk = false;
            self.handlers().forEach(h =>{
                isOk = isOk || (e[h.type] != null && e[h.type].isAppeared);
            })
            return isOk;
        }).length;
        stats.All.error = detailedStatsArray.filter(e => {
            var isOk = false;
            self.handlers().forEach(h =>{
                isOk = isOk || (e[h.type] != null && !e[h.type].isSuccess);
            })
            return isOk;
        }).length;

        return stats;
    }

    startTest() {
        this.isTestStarted(true);
        this.loopId = setInterval(() => this.doTestLoop(this), this.delayInSeconds);
        this.handlers([]);
        this.results([]);
        this.roundsCount(this.maxRoundsCount);
        var self = this;
        audio.play();
        if (this.isVisual()) {
            this.handlers.push(new ChallengeHandler(
                ChallengeType.Visual,
                "Позиция",
                (current, previous) => current.position == previous.position,
                (cell) => { cell.position = self.getRandomInt() }
            ));
        }

        if (this.isAudio()) {
            this.handlers.push(new ChallengeHandler(
                ChallengeType.Audio,
                "Звук",
                (current, previous) => current.letter == previous.letter,
                (cell) => { cell.letter = self.getRandomLetter() }
            ));
        }
    }

    endTest() {
        clearInterval(this.loopId);
        alert("Тестирование завершено!");
        this.sendResults();
        this.isTestStarted(false);
        this.results([]);
        this.detailedResults([]);
    }

    sendResults() {
        var totalCount = this.results().length;
        var succesCount = this.results().filter(r => r).length;
        var failureCount = this.results().filter(r => !r).length;

        var request = {
            NLevel: this.grid.nLevel,
            TestType: vm.handlers().map(e => e.button.text).join(", "),
            SuccessCount: succesCount,
            FailureCount: failureCount,
            SuccessRate: succesCount / totalCount,
            Name: this.userName()
        }

        var detailed = flattenObject(vm.getDetailedStats())

        Object.assign(request,detailed);

        $.ajax({ "url": apiUrl, method: "GET", dataType: "json", data: request });
    }

    doTestLoop(vm) {
        if (vm.grid.previousActiveCell() != null) {
            var isAllSuccess = true;
            var detailedResult = {};
            vm.handlers().forEach(h => {
                let isButtonPressed = h.button.isPressed();
                let isHandlerSuccess = vm.isHandlerSuccess(h);
                let isSuccess = isHandlerSuccess == isButtonPressed;

                if (isButtonPressed || isHandlerSuccess){
                    detailedResult[h.type] = {};
                    detailedResult[h.type].isAppeared = isHandlerSuccess;
                    detailedResult[h.type].isSuccess = isSuccess;
                }

                console.log(`${h.button.text}: ${isSuccess}`);
                isAllSuccess = isAllSuccess && isSuccess;
            });
        
            vm.results.push(isAllSuccess);
            if (Object.keys(detailedResult).length > 0){
                vm.detailedResults.push(detailedResult);
            }
        } 

        if (vm.roundsCount() <= 0) {
            vm.endTest();
            return;
        }

        var newCell = new Cell();

        vm.handlers().forEach(h => {
            h.handleCell(newCell);
        });

        vm.grid.updateCell(newCell);

        vm.handlers().forEach(h => h.button.reset())

        vm.roundsCount(vm.roundsCount() - 1);
    }

    getRandomInt() {
        var previousCell = this.grid.nextPreviousCell();

        if (previousCell != null && previousCell.position != null && this.isProbability(0.25)){
            console.log('previous pos: '+ previousCell.position);
            window.previousCell = true;
            return previousCell.position;
        }  else {
            window.previousCell = false;
            let newPos = 1 + Math.floor(Math.random() * Math.floor(this.grid.totalCount - 1));
            console.log('new pos: '+ newPos);
            return newPos;
        }
    }

    getRandomLetter() {
        var letter;
        var previousCell = this.grid.nextPreviousCell();
        if (previousCell != null && previousCell.letter != null && this.isProbability(0.25)) {
            letter = previousCell.letter;
            console.log('previous letter: '+ previousCell.letter)
        } else {
            window.previousLetter = false;
            letter = this.letters[Math.floor(Math.random() * this.letters.length)];
            console.log('new letter: '+ letter)
        }

        audio.src = `${audioUrl}/audio/${letter}.mp3`;
        audio.play();
        // let audio = document.querySelector(`#letters #${letter}`);
        // audio.play();
        return letter;
    }

    isProbability(probability) {
        return Math.random() <= probability;
    }

    isHandlerSuccess(handler) {
        var previousActiveCell = this.grid.previousActiveCell();
        return previousActiveCell != null &&
            handler.isSuccess(this.grid.currentActiveCell(), previousActiveCell);
    }

    buttonPressed(handler) {
        if (!handler.button.isPressed()) {
            var isSuccess = this.isHandlerSuccess(handler);
            handler.button.press(isSuccess);
        }
    }
}

var vm = new ViewModel();
ko.applyBindings(vm);