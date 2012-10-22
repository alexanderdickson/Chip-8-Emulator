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
    var boundArgs = [].slice.call(arguments, 1);
    var boundFn = this;

    return function() {        
        return boundFn.apply(context, boundArgs.concat([].slice.call(arguments)));
    };
};
