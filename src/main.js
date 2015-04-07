/// <reference path="../deps/hammer.d.ts" />
/// <reference path="../deps/jquery.d.ts" />
/// <reference path="../deps/jquery-ui.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
////////////////////////////////
// Misc
////////////////////////////////
function fireNewEvent(name, el, data) {
    var event = (new CustomEvent(name, { detail: data }));
    el.dispatchEvent(event);
}
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message;
    }
}
function launchIntoFullscreen(element) {
    var el = element;
    if (el.requestFullscreen) {
        el.requestFullscreen();
    }
    else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
    }
    else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    }
    else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
    }
}
function exitFullscreen() {
    var doc = document;
    if (doc.exitFullscreen) {
        doc.exitFullscreen();
    }
    else if ((doc).mozCancelFullScreen) {
        doc.mozCancelFullScreen();
    }
    else if ((doc).webkitExitFullscreen) {
        doc.webkitExitFullscreen();
    }
}
function withCooldown(sec, func) {
    var cooling = false;
    return function () {
        if (!cooling) {
            func();
            cooling = true;
            setTimeout(function () { return cooling = false; }, sec);
        }
    };
}
var ButtonInits = (function () {
    function ButtonInits() {
    }
    ButtonInits.topLeft = function (el, parent) {
        return new Trans(0, 0, 0, 1, 1);
    };
    ButtonInits.topCenter = function (el, parent) {
        var w = parent.offsetWidth;
        var bW = el.offsetWidth;
        var cW = bW / 2;
        return new Trans((w / 2) - cW, 0, 0, 1, 1);
    };
    ButtonInits.topRight = function (el, parent) {
        var w = parent.offsetWidth;
        var bW = el.offsetWidth;
        return new Trans(w - bW, 0, 0, 1, 1);
    };
    ButtonInits.bottomLeft = function (el, parent) {
        var bH = el.offsetHeight;
        var h = parent.offsetHeight;
        return new Trans(0, h - bH, 0, 1, 1);
    };
    ButtonInits.bottomCenter = function (el, parent) {
        var bH = el.offsetHeight;
        var h = parent.offsetHeight;
        var w = parent.offsetWidth;
        var bW = el.offsetWidth;
        var cW = bW / 2;
        return new Trans((w / 2) - cW, h - bH, 0, 1, 1);
    };
    ButtonInits.bottomRight = function (el, parent) {
        var bH = el.offsetHeight;
        var h = parent.offsetHeight;
        var w = parent.offsetWidth;
        var bW = el.offsetWidth;
        return new Trans(w - bW, h - bH, 0, 1, 1);
    };
    ButtonInits.inits = [
        { trans: ButtonInits.topLeft, id: "topLeft", angles: [70, 110] },
        { trans: ButtonInits.topCenter, id: "topCenter", angles: [110, 110] },
        { trans: ButtonInits.topRight, id: "topRight", angles: [190, 110] },
        { trans: ButtonInits.bottomLeft, id: "bottomLeft", angles: [10, 110] },
        { trans: ButtonInits.bottomCenter, id: "bottomCenter", angles: [310, 110] },
        { trans: ButtonInits.bottomRight, id: "bottomRight", angles: [250, 110] }
    ];
    return ButtonInits;
})();
////////////////////////////////
// Transformable
////////////////////////////////
var Trans = (function () {
    function Trans(px, py, angle, sx, sy) {
        if (angle === void 0) { angle = 0; }
        if (sx === void 0) { sx = 0; }
        if (sy === void 0) { sy = 0; }
        this.px = px;
        this.py = py;
        this.angle = angle;
        this.sx = sx;
        this.sy = sy;
    }
    Trans.prototype.add = function (trans) {
        return new Trans(this.px + trans.px, this.py + trans.py, this.angle + trans.angle, this.sx + trans.sx, this.sy + trans.sy);
    };
    Trans.prototype.toString = function () {
        return ("" + "translate(" + this.px + "px, " + this.py + "px) rotate(" + this.angle + "deg) scale(" + this.sx + ", " + this.sy + ")");
    };
    return Trans;
})();
var Transformable = (function () {
    function Transformable(el, current) {
        if (current === void 0) { current = new Trans(0, 0, 0, 1, 1); }
        this.el = el;
        this.current = current;
        this.count = 0;
    }
    Transformable.prototype.translate = function (target) {
        this.current = target;
        this.el.style.transform = target.toString();
        this.el.style.webkitTransform = target.toString();
    };
    Transformable.prototype.animate = function (target, steps, interval, onDone) {
        this.target = target;
        var transs = this.interpolate(target, steps);
        var start = this.current;
        var that = this;
        // The count is to prevent multiple animations from running at
        // the same time.
        var currentCount = ++this.count;
        var func = function () {
            if (transs.length > 0 && currentCount == that.count) {
                that.translate(transs.pop().add(start));
                setTimeout(func, interval);
            }
            else if (transs.length == 0 && onDone) {
                onDone(that);
            }
        };
        func();
    };
    Transformable.prototype.interpolate = function (target, steps) {
        var transs = [];
        for (var i = 1; i <= steps; i++) {
            transs.push(new Trans(((target.px - this.current.px) / steps) * i, ((target.py - this.current.py) / steps) * i, ((target.angle - this.current.angle) / steps) * i, ((target.sx - this.current.sx) / steps) * i, ((target.sy - this.current.sy) / steps) * i));
        }
        return transs.reverse();
    };
    return Transformable;
})();
////////////////////////////////
// Video Player
////////////////////////////////
var VideoPlayer = (function () {
    function VideoPlayer(el, source, time) {
        if (time === void 0) { time = 0; }
        this.el = el;
        this.source = source;
        this.time = time;
    }
    VideoPlayer.fromCurrentVideo = function (el) {
        assert(VideoPlayer.activePlayer, "oldPlayer");
        var ret = new VideoPlayer(el, VideoPlayer.video.src, VideoPlayer.video.currentTime);
        VideoPlayer.snapshot(function (url) {
            ret.setBackground(url);
        });
        return ret;
    };
    VideoPlayer.snapshot = function (onSucces) {
        var video = VideoPlayer.video;
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var vW = video.videoWidth;
        var vH = video.videoHeight;
        var ratio = vW / vH;
        var rH = vW / ratio;
        var dH = vH - rH;
        try {
            canvas.width = vW / 5;
            canvas.height = vH / 5;
            ctx.fillStyle = "rgba(0, 0, 0, 0)";
            ctx.fillRect(0, 0, vW, vH);
            ctx.drawImage(video, 0, 0, vW, vH, 0, dH / 2, vW / 5, rH / 5);
            onSucces(canvas.toDataURL());
        }
        catch (err) {
            console.log(err);
        }
    };
    VideoPlayer.prototype.setBackground = function (url) {
        this.el.style.backgroundSize = "100%";
        this.el.style.backgroundPosition = "center";
        this.el.style.backgroundRepeat = "no-repeat";
        this.el.style.backgroundImage = "url(" + url + ")";
    };
    VideoPlayer.prototype.deactivate = function () {
        var _this = this;
        assert(VideoPlayer.activePlayer === this, "Player to deactivate needs to be active.");
        if (this.onDeactivated)
            this.onDeactivated();
        VideoPlayer.snapshot(function (url) {
            _this.setBackground(url);
            if (VideoPlayer.video.parentElement) {
                VideoPlayer.video.parentElement.removeChild(VideoPlayer.video);
            }
            // FIXE:	this.time = VideoPlayer.video.currentTime;
            _this.source = VideoPlayer.video.src;
        });
    };
    VideoPlayer.prototype.activate = function (onDone) {
        var _this = this;
        var video = VideoPlayer.video;
        if (VideoPlayer.activePlayer) {
            VideoPlayer.activePlayer.deactivate();
        }
        video.src = this.source;
        var cont = function () {
            video.currentTime = _this.time;
            video.oncanplay = function () {
                video.oncanplay = null;
                VideoPlayer.activePlayer = _this;
                _this.el.appendChild(VideoPlayer.video);
                VideoPlayer.video.style.opacity = "1.0";
                if (onDone)
                    onDone();
            };
            video.onerror = function () {
                video.onerror = null;
                throw ("VideoPlayer::activate()");
            };
        };
        video.src = this.source;
        video.onloadstart = function () {
            if (video.readyState >= 1) {
                cont();
            }
            else {
                video.onloadedmetadata = function () {
                    video.onloadedmetadata = null;
                    cont();
                };
            }
        };
    };
    VideoPlayer.prototype.play = function (onDone) {
        this.activate(onDone);
        VideoPlayer.video.play();
    };
    VideoPlayer.prototype.pause = function () {
        VideoPlayer.video.pause();
    };
    VideoPlayer.prototype.setTime = function (v) {
        this.time = v;
    };
    VideoPlayer.prototype.onDeactivated = function () {
    };
    VideoPlayer.video = (function () {
        var ret = document.createElement("video");
        ret.style.width = "100%";
        ret.style.height = "100%";
        ret.setAttribute("controls", "true");
        return ret;
    })();
    return VideoPlayer;
})();
////////////////////////////////
// Upload menu
////////////////////////////////
var MenuItem = (function () {
    function MenuItem(label, image, menu) {
        var _this = this;
        this.label = label;
        this.image = image;
        this.menu = menu;
        // Create the element ...
        this.el = (function () {
            var elItem = document.createElement("div");
            var elImage = document.createElement("img");
            var elLabel = document.createElement("a");
            elItem.classList.add("menuItem");
            elItem.appendChild(elImage);
            elItem.appendChild(elLabel);
            elImage.src = image;
            elLabel.innerText = label;
            return elItem;
        })();
        // Make it tap-able ...
        this.mc = new Hammer.Manager(this.el);
        var mc = this.mc;
        mc.add(new Hammer.Tap());
        mc.on("tap", function (ev) {
            withCooldown(500, function () { return fireNewEvent("tap", _this.el); })();
        });
    }
    return MenuItem;
})();
var RemovableMenuItem = (function (_super) {
    __extends(RemovableMenuItem, _super);
    function RemovableMenuItem(label, image, menu) {
        var _this = this;
        _super.call(this, label, image, menu);
        this.transf = new Transformable(this.el);
        var panStartTrans;
        var panStartTrans;
        var mc = this.mc;
        this.mc.add(new Hammer.Pan({ preventDefault: true }));
        this.mc.on("panstart", function (ev) {
            panStartTrans = _this.transf.current;
        });
        this.mc.on("panmove", function (ev) {
            _this.transf.translate(new Trans(ev.deltaX, 0).add(panStartTrans));
            var w = _this.el.offsetWidth;
            _this.el.style.opacity = String(1 - ((1 / w) * ev.deltaX));
        });
        this.mc.on("panend pancancel", function (ev) {
            _this.el.style.opacity = String(1);
            _this.transf.translate(new Trans(0, 0, 0, 1, 1));
            var w = _this.el.offsetWidth;
            if (ev.deltaX > w) {
                _this.mc.destroy();
                _this.menu.removeItem(_this);
            }
        });
    }
    return RemovableMenuItem;
})(MenuItem);
var VideoItem = (function (_super) {
    __extends(VideoItem, _super);
    function VideoItem(label, image, menu) {
        _super.call(this, label, image, menu);
    }
    return VideoItem;
})(RemovableMenuItem);
var Menu = (function () {
    function Menu(el) {
        this.el = el;
        this.items = [];
    }
    Menu.prototype.addItem = function (item) {
        this.el.appendChild(item.el);
        item.el.style.opacity = "0.0";
        $(item.el).animate({
            opacity: 1.0
        }, 500);
        this.items.push(item);
        fireNewEvent("addedItem", this.el, { item: item });
    };
    Menu.prototype.removeItem = function (item) {
        if (this.items.indexOf(item) > -1) {
            this.items = this.items.filter(function (x) { return (x !== item); });
            item.el.parentNode.removeChild(item.el);
            fireNewEvent("removedItem", this.el, { item: item });
            return true;
        }
        return false;
    };
    return Menu;
})();
var VideoMenu = (function (_super) {
    __extends(VideoMenu, _super);
    function VideoMenu(el) {
        var _this = this;
        _super.call(this, el);
        var createFileInput = function () {
            var el = document.createElement("input");
            el.type = "file";
            el.onchange = function () {
                var split = el.value.split("\\");
                var label = split[split.length - 1].split(".")[0];
                _this.addVideo(URL.createObjectURL(el.files[0]), label);
                // Create a new FileInput directly so the same file can
                // be selected multiple times.
                fileInput = createFileInput();
            };
            return el;
        };
        var fileInput = createFileInput();
        var addVideoButton = (function () {
            var el = document.createElement("div");
            var item = new MenuItem("video toevoegen", "", _this);
            item.el.classList.add("addVideo");
            item.el.addEventListener("click", function (event) {
                fileInput.click();
            });
            return item;
        })();
        this.addItem(addVideoButton);
    }
    VideoMenu.prototype.addVideo = function (url, label) {
        var _this = this;
        var el = document.createElement("div");
        var player = new VideoPlayer(document.createElement("div"), url, 20);
        player.play(function () {
            player.pause();
            var item = new VideoItem(label, "", _this);
            item.el.addEventListener("tap", function (ev) {
                var el = document.getElementById("video");
                var player = new VideoPlayer(el, url, 0);
                $(player.el).animate({
                    opacity: 1
                });
                // Enlarge video ...
                $("#video").css({
                    width: "1%",
                    height: "1%"
                }).animate({
                    width: "100%",
                    height: "100%"
                });
                mustHideButtons = true;
                hideButtons();
                sideBar.expanded = false;
                VideoPlayer.video.controls = true;
                VideoPlayer.video.onended = function () {
                    // Ended for the first time...
                    // Shrink video
                    $("#video").animate({
                        width: "60%",
                        height: "60%"
                    });
                    mustHideButtons = false;
                    unHideButtons();
                    // Replay
                    VideoPlayer.video.currentTime = 0;
                    // Activate buttons (TODO)
                    VideoPlayer.video.onended = function () {
                        // Ended for the second time...
                        VideoPlayer.video.onended = null;
                        $(player.el).animate({
                            opacity: 0
                        });
                        buttons.forEach(function (button) {
                            // Exapand all buttons.
                            button.expand();
                        });
                    };
                };
                buttons.forEach(function (button) { return button.reset(); });
                player.play();
            });
            VideoPlayer.snapshot(function (image) {
                var el = item.el;
                el.style.backgroundImage = "url(" + image + ")";
                el.style.backgroundRepeat = "no-repeat";
                el.style.backgroundSize = "100%";
                el.style.backgroundPosition = "center";
                _super.prototype.addItem.call(_this, item);
            });
        });
    };
    return VideoMenu;
})(Menu);
////////////////////////////////
// Fan
////////////////////////////////
var FanItem = (function () {
    function FanItem(el, player) {
        this.el = el;
        this.player = player;
        this.transf = new Transformable(el);
    }
    FanItem.prototype.onPlaced = function () {
    };
    return FanItem;
})();
var ManipulatableFanItem = (function (_super) {
    __extends(ManipulatableFanItem, _super);
    function ManipulatableFanItem(el, player) {
        _super.call(this, el, player);
        this.startTime = player.time;
    }
    ManipulatableFanItem.prototype.onPlaced = function () {
        var _this = this;
        this.mc = new Hammer.Manager(this.el, {
            preventDefault: true
        });
        this.mc.add(new Hammer.Tap());
        this.mc.add(new Hammer.Rotate());
        this.mc.add(new Hammer.Pinch());
        var panStartTrans;
        this.mc.on("rotatestart pinchstart", function (ev) {
            panStartTrans = _this.transf.current;
            ManipulatableFanItem.runningZ++;
            _this.el.style.zIndex = String(ManipulatableFanItem.runningZ);
        });
        this.mc.on("rotatemove pinchmove", function (ev) {
            _this.transf.translate(new Trans(panStartTrans.px + ev.deltaX, panStartTrans.py + ev.deltaY, panStartTrans.angle + ev.rotation, panStartTrans.sx * ev.scale, panStartTrans.sy * ev.scale));
        });
        this.mc.on("rotateend rotatecancel pinchend pinchcancel", function (ev) {
        });
        this.stopPlaying();
    };
    ManipulatableFanItem.prototype.startPlaying = function () {
        var _this = this;
        var start = Math.max(0, this.startTime - (momentTime / 2));
        var video = VideoPlayer.video;
        this.player.setTime(start);
        video.controls = false;
        this.player.play(function () {
            _this.el.onclick = video.onended = _this.player.onDeactivated = function () {
                _this.stopPlaying();
            };
            video.ontimeupdate = function () {
                if (video.currentTime - start > momentTime) {
                    _this.stopPlaying();
                }
            };
        });
    };
    ManipulatableFanItem.prototype.stopPlaying = function () {
        var _this = this;
        var video = VideoPlayer.video;
        video.onended = video.ontimeupdate = this.player.onDeactivated = null;
        video.pause();
        this.el.onclick = function () {
            _this.startPlaying();
        };
    };
    ManipulatableFanItem.runningZ = 4;
    return ManipulatableFanItem;
})(FanItem);
var RemovableFanItem = (function (_super) {
    __extends(RemovableFanItem, _super);
    function RemovableFanItem(el, fan, player) {
        _super.call(this, el, player);
        this.fan = fan;
    }
    RemovableFanItem.prototype.onPlaced = function () {
        var _this = this;
        this.mc = new Hammer.Manager(this.el, {
            preventDefault: true
        });
        this.mc.add(new Hammer.Pan());
        var panStartTrans;
        this.mc.on("panstart", function (ev) {
            panStartTrans = _this.transf.current;
        });
        this.mc.on("panmove", function (ev) {
            _this.transf.translate(new Trans(ev.deltaX, ev.deltaY).add(panStartTrans));
            var distance = _this.el.offsetWidth;
            _this.el.style.opacity = String(1 - (ev.distance / distance));
        });
        this.mc.on("panend pancancel", function (ev) {
            var distance = _this.el.offsetWidth;
            _this.el.style.opacity = "1";
            _this.transf.translate(panStartTrans);
            if (ev.distance >= distance) {
                _this.mc.destroy();
                _this.fan.removeItem(_this);
            }
        });
        this.mc.on("panend pancancel", function (ev) {
            var distance = _this.el.offsetWidth;
            _this.el.style.opacity = "1";
            _this.transf.translate(panStartTrans);
            if (ev.distance >= distance) {
                _this.mc.destroy();
                _this.fan.removeItem(_this);
            }
        });
    };
    return RemovableFanItem;
})(FanItem);
var Fan = (function () {
    function Fan(lineFunc, maxItems, onFull, onRoomAgain, animationInterval, animationSteps) {
        if (animationInterval === void 0) { animationInterval = 20; }
        if (animationSteps === void 0) { animationSteps = 20; }
        this.lineFunc = lineFunc;
        this.onFull = onFull;
        this.onRoomAgain = onRoomAgain;
        this.animationInterval = animationInterval;
        this.animationSteps = animationSteps;
        this.items = [];
        this.itemsPlaced = 0;
        this.el = document.createElement("div");
        this._maxItems = maxItems;
    }
    Fan.prototype.placeItems = function (onPlaced) {
        var points = this.lineFunc(this.items.length);
        var that = this;
        this.itemsPlaced = 0;
        this.items.forEach(function (item, c) {
            item.transf.animate(points[c], that.animationSteps, that.animationInterval, function (transf) {
                item.onPlaced();
                that.itemsPlaced++;
                if (that.itemsPlaced == that.items.length && onPlaced)
                    onPlaced();
            });
        });
    };
    Fan.prototype.addItem = function (item) {
        if (this.items.length < this.maxItems) {
            this.items.push(item);
            this.el.appendChild(item.el);
            this.placeItems();
            if (this.items.length == this.maxItems) {
                if (this.onFull)
                    this.onFull(this);
            }
        }
    };
    Fan.prototype.itemPop = function () {
        var item = this.items.pop();
        if (item) {
            item.el.parentElement.removeChild(item.el);
        }
    };
    Fan.prototype.removeItem = function (item) {
        this.items = this.items.filter(function (b) { return item !== b; });
        if (item.el.parentElement) {
            item.el.parentElement.removeChild(item.el);
        }
        this.placeItems();
        if (this.isFull()) {
            if (this.onRoomAgain)
                this.onRoomAgain(this);
        }
    };
    Fan.prototype.removeAll = function () {
        this.items.forEach(function (item) {
            item.el.parentElement.removeChild(item.el);
        });
        this.items = [];
        this.placeItems();
    };
    Fan.prototype.swapItem = function (oldItem, newItem) {
        this.items = this.items.map(function (item) { return item === oldItem ? newItem : item; });
        oldItem.el.parentElement.removeChild(oldItem.el);
        this.el.appendChild(newItem.el);
        // Keeps animating after swap, FIXME: Steps will be off.
        newItem.transf.translate(oldItem.transf.target);
        newItem.onPlaced();
        return true;
    };
    Fan.prototype.swapLineFunc = function (func, onPlaced) {
        this.lineFunc = func;
        this.placeItems(onPlaced);
    };
    Fan.prototype.isFull = function () {
        return this.items.length >= this.maxItems - 1;
    };
    Object.defineProperty(Fan.prototype, "maxItems", {
        get: function () {
            return this._maxItems;
        },
        set: function (v) {
            while (this.items.length > v) {
                this.itemPop();
            }
            this._maxItems = v;
        },
        enumerable: true,
        configurable: true
    });
    return Fan;
})();
function makeCircleFunc(radius, itemProCircle, angle) {
    if (angle === void 0) { angle = 0; }
    return function (count) {
        var transs = [];
        var d = (Math.PI * 2) / itemProCircle;
        var a = (Math.PI * 4) + ((angle - 90) * (Math.PI / 180));
        for (var i = 0; i < count; i++) {
            var x = Math.cos((d * i) + a) * radius;
            var y = Math.sin((d * i) + a) * radius;
            transs.push(new Trans(x, y, d * i * (180 / Math.PI), 1, 1));
        }
        return transs;
    };
}
////////////////////////////////
// FanButton
////////////////////////////////
var FanButton = (function () {
    function FanButton(parent, transFunc, radiusRatio, expandedRadiusRatio, fromAngle, angleLength, 
        //Fixme: does not auto update
        maxItems) {
        var _this = this;
        this.parent = parent;
        this.transFunc = transFunc;
        this.radiusRatio = radiusRatio;
        this.expandedRadiusRatio = expandedRadiusRatio;
        this.fromAngle = fromAngle;
        this.angleLength = angleLength;
        this.maxItems = maxItems;
        this.expanded = false;
        this.active = false;
        this.el = document.createElement("div");
        this.el.classList.add("button");
        this.el.classList.add("placeHolder");
        this.parent.appendChild(this.el);
        this.transf = new Transformable(this.el);
        this.fan = new Fan(this.fanCircleFunc(), maxItems);
        this.parent.appendChild(this.fan.el);
        window.addEventListener("resize", function () {
            _this.place();
        });
        this.place();
    }
    FanButton.prototype.addFunc = function () {
        var _this = this;
        this.active = true;
        this.el.classList.remove("placeHolder");
        this.el.onclick = function () {
            _this.removeFunc();
        };
    };
    FanButton.prototype.removeFunc = function () {
        var _this = this;
        this.fan.removeAll();
        this.active = false;
        this.el.classList.add("placeHolder");
        this.el.onclick = function () {
            _this.addFunc();
        };
    };
    FanButton.prototype.activeFunc = function () {
        var el = document.createElement("div");
        var player = VideoPlayer.fromCurrentVideo(el);
        var item = new RemovableFanItem(el, this.fan, player);
        // Make appear come from the center of the stage...
        var centerX = (this.parent.offsetWidth / 2) - (this.el.offsetWidth / 2);
        var centerY = (this.parent.offsetHeight / 2) - (this.el.offsetHeight / 2);
        item.transf.translate(new Trans(centerX, centerY, 0, 1, 1));
        // Make elements slowly fade in...
        el.style.opacity = "0.0";
        $(el).animate({
            opacity: "1.0"
        }, 500);
        this.fan.addItem(item);
        el.classList.add("fanItem");
        el.classList.add(this.el.classList[1]);
    };
    FanButton.prototype.expand = function () {
        var _this = this;
        if (!this.expanded) {
            this.expanded = true;
            this.el.onclick = null;
            this.fan.swapLineFunc(this.fanCircleFunc(), function () {
                _this.fan.items.forEach(function (item) {
                    var el = item.el.cloneNode(false);
                    el.classList.add("fanItem");
                    var newItem = new ManipulatableFanItem(el, item.player);
                    newItem.player.el = el;
                    _this.fan.swapItem(item, newItem);
                });
            });
        }
        this.el.onclick = null;
    };
    FanButton.prototype.fanCircleFunc = function () {
        var _this = this;
        var radiusRatio = this.expanded ? this.expandedRadiusRatio : this.radiusRatio;
        var func = makeCircleFunc(this.el.offsetWidth * radiusRatio, (this.maxItems - 1) * (360 / this.angleLength), this.fromAngle);
        return function (length) {
            if (length > 0) {
                var ret = func(length);
                var ttrans = _this.transFunc(_this.el, _this.parent);
                return ret.map(function (trans) {
                    return new Trans(trans.px + ttrans.px, trans.py + ttrans.py, trans.angle, 1, 1);
                });
            }
        };
    };
    FanButton.prototype.place = function () {
        var el = document.createElement("div");
        el.classList.add("fanItem");
        this.el.appendChild(el);
        this.itemW = el.offsetWidth;
        this.el.removeChild(el);
        this.transf.translate(this.transFunc(this.el, this.parent));
        this.fan.swapLineFunc(this.fanCircleFunc());
    };
    FanButton.prototype.reset = function () {
        this.fan.removeAll();
        this.expanded = false;
        this.place();
    };
    return FanButton;
})();
;
////////////////////////////////
// Side bar
////////////////////////////////
var SideBar = (function () {
    function SideBar(el) {
        var _this = this;
        this.el = el;
        this._expanded = false;
        this.dragRatio = .9;
        this.transf = new Transformable(el);
        window.addEventListener("resize", function () {
            _this.place();
        });
        this.place();
        var mc = new Hammer.Manager(el);
        var panStartTrans;
        mc.add(new Hammer.Pan({
            preventDefault: true,
            treshold: 10
        }));
        mc.on("panstart", function (ev) {
            panStartTrans = _this.transf.current;
        });
        mc.on("panmove", function (ev) {
            if ((!_this._expanded && ev.deltaX > 0) || (_this._expanded && ev.deltaX < 0)) {
                var w = el.offsetWidth * _this.dragRatio;
                var x = Math.min(ev.deltaX, w);
                _this.transf.translate(new Trans(x, 0).add(panStartTrans));
            }
        });
        mc.on("panend pancancel", function (ev) {
            var w = el.offsetWidth * _this.dragRatio;
            _this.expanded = (_this.transf.current.px > -20);
        });
    }
    SideBar.prototype.place = function () {
        var _this = this;
        var w = this.el.offsetWidth;
        var x = this._expanded ? 0 : -w * this.dragRatio;
        this.transf.animate(new Trans(x, 0, 0, 1, 1), 20, 20);
        // Disable buttons when not expaned
        [].forEach.call(this.el.children, function (el) {
            el.style.pointerEvents = _this._expanded ? "auto" : "none";
        });
    };
    Object.defineProperty(SideBar.prototype, "expanded", {
        get: function () {
            return this._expanded;
        },
        set: function (v) {
            if (v != this._expanded) {
                fireNewEvent(v ? "expanded" : "unexpanded", this.el);
            }
            this._expanded = v;
            this.place();
        },
        enumerable: true,
        configurable: true
    });
    return SideBar;
})();
////////////////////////////////
// App
////////////////////////////////
var App = (function () {
    function App() {
        var stage = document.getElementById("stage");
        this.sideBar = new SideBar(document.getElementById("sideBar"));
        this.buttons = ButtonInits.inits.map(function (init) {
            var button = new FanButton(stage, init.trans, 1, 1.5, init.angles[0], init.angles[1], $("#qMomentSlider").slider("value"));
            button.el.id = init.id;
            stage.appendChild(button.el);
            return button;
        });
    }
    return App;
})();
////////////////////////////////
// Test
////////////////////////////////
var buttons;
var mustHideButtons = false;
function hideButtons() {
    buttons.forEach(function (b) {
        if (b.active) {
            b.el.style.opacity = "0.0";
            b.el.style.pointerEvent = "none";
        }
    });
}
function unHideButtons() {
    buttons.forEach(function (b) {
        if (b.active) {
            b.el.style.opacity = "1.0";
            b.el.style.pointerEvent = "auto";
        }
    });
}
var player;
var defaultQSnapshots = 5;
var defaultMomentTime = 5;
// FIXME: Remove ...
var momentTime = 5;
var sideBar;
window.onload = function () {
    var el = document.getElementById("sideBar");
    var stage = document.getElementById("stage");
    var menu = new VideoMenu(el);
    sideBar = new SideBar(el);
    var qMomentSlider = $("#qMomentSlider").slider({
        min: 1,
        max: 10,
        value: defaultQSnapshots,
        change: function (ev, ui) {
            buttons.forEach(function (button) {
                button.maxItems = ui.value;
                button.fan.maxItems = ui.value;
                button.place();
            });
            $("#qm").text(String(ui.value));
        }
    }).mousedown(function (ev) {
        ev.stopImmediatePropagation();
        return false;
    });
    $("#qm").text(defaultQSnapshots);
    var qTimeSlider = $("#qTimeSlider").slider({
        min: 1,
        max: 30,
        value: defaultMomentTime,
        change: function (ev, ui) {
            momentTime = ui.value;
            $("#lt").text(String(ui.value));
        }
    }).mousedown(function (ev) {
        ev.stopImmediatePropagation();
        return false;
    });
    $("#lt").text(defaultQSnapshots);
    var exit = document.getElementById("exit");
    var fullFunc = function () {
        exit.innerHTML = "volledig scherm";
        exit.onclick = function () {
            launchIntoFullscreen(document.documentElement);
            exitFullFunc();
        };
    };
    var exitFullFunc = function () {
        exit.innerHTML = "volledig scherm sluiten";
        exit.onclick = function () {
            exitFullscreen();
            fullFunc();
        };
    };
    sideBar.el.addEventListener("unexpanded", function () {
        buttons.forEach(function (button) {
            if (!button.active) {
                button.el.style.opacity = "0.0";
            }
            else {
                button.el.onclick = null;
                button.el.onclick = function () {
                    button.activeFunc();
                };
            }
            if (mustHideButtons) {
                hideButtons();
            }
        });
    });
    sideBar.el.addEventListener("expanded", function () {
        buttons.forEach(function (button) {
            button.el.style.opacity = "1.0";
            if (!button.active) {
                button.el.onclick = function () {
                    button.addFunc();
                };
            }
            else {
                button.el.onclick = function () {
                    button.removeFunc();
                };
            }
            unHideButtons();
        });
    });
    fullFunc();
    document.body.onkeypress = function () { return sideBar.expanded = !sideBar.expanded; };
    buttons = ButtonInits.inits.map(function (init) {
        var button = new FanButton(stage, init.trans, 1, 1.5, init.angles[0], init.angles[1], $("#qMomentSlider").slider("value"));
        button.el.classList.add(init.id);
        button.el.classList.add(init.id + "Button");
        button.el.style.opacity = "0.0";
        stage.appendChild(button.el);
        return button;
    });
    // Prevent history swipe
    document.addEventListener("touchmove", function (ev) { return ev.preventDefault(); });
    document.addEventListener("wheel", function (ev) { return ev.preventDefault(); });
};
//# sourceMappingURL=main.js.map