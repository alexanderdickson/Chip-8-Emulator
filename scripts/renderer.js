var CanvasRenderer = function(canvas, width, height, cellSize, fgColor, bgColor) {
    this.ctx = canvas.getContext("2d");
    this.canvas = canvas;
    this.width = +width;
    this.height = +height;
	this.lastRenderedData = [];
    this.setCellSize(cellSize);
	this.lastDraw = 0;
	this.draws = 0;

    this.fgColor = fgColor || "#0f0";
    this.bgColor = bgColor || "transparent";
	
	this.audioContext = window.AudioContext && new AudioContext ||
	                    window.webkitAudioContext && new webkitAudioContext;
	
};

CanvasRenderer.prototype = {

    clear: function () {
        this.ctx.clearRect(0, 0, this.width * this.cellSize, this.height * this.cellSize);
    },

    render: function (display) {
        this.clear();
		this.lastRenderedData = display;
        var i, x, y;
        for (i = 0; i < display.length; i++) {
              x = (i % this.width) * this.cellSize;
              y = Math.floor(i / this.width) * this.cellSize;

            this.ctx.fillStyle = [this.bgColor, this.fgColor][display[i]];
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
		
		this.draws++;
    },

    beep: function() {
		// If Web Audio is supported, we "beep".
		// Otherwise, we shake the display.
		if (this.audioContext) {
			var osc = this.audioContext.createOscillator();
			osc.connect(this.audioContext.destination);
			osc.type = "triangle";
			osc.start();
			setTimeout(function() {
				osc.stop();
			}, 100);
			return;
		}
		
        var times = 5;
        var interval = setInterval(function(canvas) {
            if ( ! times--) {
                clearInterval(interval);
            }

            canvas.style.left = times % 2 ? "-3px" : "3px";

        }, 50, this.canvas);
    },
	
	setFgColor: function(color) {
		this.fgColor = color;
	},
	
	setCellSize: function(cellSize) {
		this.cellSize = +cellSize;

	    this.canvas.width = cellSize * this.width;
	    this.canvas.height = cellSize * this.height;
		
		this.render(this.lastRenderedData);
	},
	
	getFps: function() {

		var fps = this.draws / (+new Date - this.lastDraw) * 1000;
		if (fps == Infinity) {
			return 0;
		}
		this.draws = 0;
		this.lastDraw = +new Date;
		return fps;
	}
};