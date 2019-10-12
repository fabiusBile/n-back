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
          } else if (obj[paramName] && typeof obj[paramName] === 'string'){
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

const ChallengeType =  Object.freeze({
    "Visual" : "Visual",
    "Audio" : "Audio"
});

class ChallengeHandler{
    constructor(type, buttonText, comparer, handler){
        this.type = type;
        this.comparer = comparer; 
        this.handler = handler;

        this.button = new Button(buttonText, type);
    }

    isSuccess(previousCell, currentCell){
        return this.comparer(previousCell, currentCell);
    }

    handleCell(cell){
        this.handler(cell);
    }
}

class Button{
    constructor(text, challengeType){
        this.text = text;
        this.isPressed = ko.observable(false);
        this.isSuccess= ko.observable(false);
        this.challengeType = challengeType;
        
        var self = this;
        this.cssClass = ko.computed(() => {
            if (self.isPressed()){
                return self.isSuccess() ? "success" : "failure";
            } else {
                return "";
            }
        });
    }

    press(isSuccess){
        if (!this.isPressed()){
            this.isSuccess(isSuccess);
            this.isPressed(true);
        }
    }

    reset(){
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
    constructor(horizontalCount, verticalCount) {
        this.totalCount = horizontalCount * verticalCount;
        this.horizontalCount = horizontalCount;
        this.verticalCount = verticalCount;

        this.currentActiveCell = ko.observable(new Cell());
        this.previousActiveCell = null;
    }

    updateCell(newCell) {
        this.previousActiveCell = this.currentActiveCell();
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

        
        this.isVisual = params.visual != undefined;
        this.isAudio = params.audio != undefined;

        this.grid = new Grid(3, 3);
        this.roundsCount = ko.observable(this.maxRoundsCount);
        this.isButtonPressed = false;
        this.handlers = ko.observableArray();
        this.letters = ['а',"б","в"];
        this.results = ko.observableArray([]);

        var self = this;
        this.finalResult = ko.computed(() => {
            var totalCount = self.results().length;
            var succesCount =  self.results().filter(r => r).length;
            var failureCount = self.results().filter(r => !r).length;

            return `Всего: ${totalCount} / Успешно: ${succesCount} / Не успешно: ${failureCount}`;
        })

        if (this.isTestStarted()) {
            this.startTest();
        }

    }

    startTest() {
        this.loopId = setInterval(() => this.doTestLoop(this), this.delayInSeconds);
        this.handlers([]);
        this.results([]);
        var self = this;

        if (this.isVisual){
            this.handlers.push(new ChallengeHandler(
                ChallengeType.Visual,
                "Позиция",
                (current, previous) => current.position == previous.position,
                (cell) => {cell.position = self.getRandomInt()}
            ));
        }

        if (this.isAudio){
            this.handlers.push(new ChallengeHandler(
                ChallengeType.Audio,
                "Звук",
                (current, previous) => current.letter == previous.letter,
                (cell) => {cell.letter = self.getRandomLetter()}
            ));
        }
    }

    endTest() {
        clearInterval(this.loopId);
        alert("Тестирование завершено!");
        this.isTestStarted(false);
    }

    doTestLoop(vm) {
        if (vm.roundsCount() != vm.maxRoundsCount){
            var isAllSuccess = true;

            vm.handlers().forEach(h => {
                let isButtonPressed = h.button.isPressed();
                let isSuccess = vm.isHandlerSuccess(h) == isButtonPressed;
                console.log(`${h.button.text}: ${isSuccess}`);
                isAllSuccess = isAllSuccess && isSuccess;
            });
            console.log(isAllSuccess);
            vm.results.push(isAllSuccess);
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
        return 1 + Math.floor(Math.random() * Math.floor(this.grid.totalCount - 1));
    }

    getRandomLetter(){
        let letter = this.letters[Math.floor(Math.random() * this.letters.length)];
        var msg = new SpeechSynthesisUtterance(letter);
        msg.lang="ru-RU";
        window.speechSynthesis.speak(msg);
        return letter;
    }

    isHandlerSuccess(handler){
     return  this.grid.previousActiveCell != null &&
        handler.isSuccess(this.grid.currentActiveCell(), this.grid.previousActiveCell);
    }

    buttonPressed(handler) {
        if (!handler.button.isPressed()){
            var isSuccess = this.isHandlerSuccess(handler);
            handler.button.press(isSuccess);
        }
    }
}

var vm = new ViewModel();
ko.applyBindings(vm);