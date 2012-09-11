window.requestAnimFrame = (function () {
 return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 0);
        };
})();

Function.prototype.bind = Function.prototype.bind || function(context) {
    return this.apply(context, arguments);
}
