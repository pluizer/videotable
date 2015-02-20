/// <reference path="../deps/hammer.d.ts" />
/// <reference path="../deps/jquery.d.ts" />

////////////////////////////////
// Misc
////////////////////////////////
function fireNewEvent(
    name : string,
    el : HTMLElement,
    data? : any
) : void {
    var event = <CustomEvent>(new (<any>CustomEvent)(name, { detail: data }));
    el.dispatchEvent(event);
}

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

////////////////////////////////
// Positions
////////////////////////////////

class Positions {

    static topLeft(el : HTMLElement, parent : HTMLElement)
    : Trans {
	return new Trans(0, 0, 0, 1, 1);
    }
    static topCenter(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var w  = parent.offsetWidth;
	var bW = el.offsetWidth;
	var cW = bW/2;
	return new Trans((w/2)-cW, 0, 1, 1);
    }
    static topRight(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var w  = parent.offsetWidth;
	var bW = el.offsetWidth;
	return new Trans(w-bW, 0, 0, 1, 1);
    }
    static bottomLeft(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var bH = el.offsetHeight;
	var h  = parent.offsetHeight;
	return new Trans(0, h-bH, 0, 1, 1);
    }
    static bottomCenter(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var bH = el.offsetHeight;
	var h  = parent.offsetHeight;       
	var w  = parent.offsetWidth;
	var bW = el.offsetWidth;
	var cW = bW/2;
	return new Trans((w/2)-cW, h-bH, 0, 1, 1);
    }
    static bottomRight(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var bH = el.offsetHeight;
	var h  = parent.offsetHeight;       
	var w  = parent.offsetWidth;
	var bW = el.offsetWidth;
	return new Trans(w-bW, h-bH, 0, 1, 1);
    }
}
    
////////////////////////////////
// App
////////////////////////////////

////////////////////////////////
// Transformable
////////////////////////////////

class Trans {
    constructor(public px : number,
		public py : number,
		public angle : number = 0,
		public sx : number = 0,
		public sy : number = 0) {
    }

    add(trans : Trans)
    : Trans {
	return new Trans(
	    this.px + trans.px,
	    this.py + trans.py,
	    this.angle + trans.angle,
	    this.sx + trans.sx,
	    this.sy + trans.sy
	);
    }

    toString()
    : string {
	return (""
		+ "translate(" + this.px 
		+ "px, " + this.py
		+ "px) rotate(" + this.angle
		+ "deg) scale(" + this.sx
		+ ", " + this.sy + ")"
	);
    }
}

class Transformable {
    target : Trans;
    count : number;
    constructor(
	public el : HTMLElement,
	public current : Trans = new Trans(0, 0, 0, 1, 1)) {
	this.count = 0;
    }

    translate(target : Trans)
    : void {
	this.current = target;
	this.el.style.transform = target.toString();
	(<any>this.el.style).webkitTransform = target.toString();
    }

    animate(target : Trans, steps : number, interval : number,
	    onDone? : (transf : Transformable) => any)
    : void {
	this.target = target;
	var transs = this.interpolate(target, steps);
	var start = this.current;
	var that = this;
	// The count is to prevent multiple animations from running at
	// the same time.
	var currentCount = ++this.count;
	var func = function() {
	    if (transs.length > 0 && currentCount == that.count) {
		that.translate(transs.pop().add(start));
		setTimeout(func, interval);
	    } else if (transs.length == 0 && onDone) {
		onDone(that);
	    }
	}; func();
    }
    
    private interpolate(target : Trans, steps : number)
    : Trans[] {
	var transs = [];
	for (var i=1; i<=steps; i++) {
	    transs.push(new Trans(
		((target.px - this.current.px) / steps) * i,
		((target.py - this.current.py) / steps) * i,
		((target.angle - this.current.angle) / steps) * i,
		((target.sx - this.current.sx) / steps) * i,
		((target.sy - this.current.sy) / steps) * i
	    ));
	}
	return transs.reverse();
    }
}

////////////////////////////////
// Video Player
////////////////////////////////

class VideoPlayer {
    static activePlayer : VideoPlayer;
    static video : HTMLVideoElement = (() => {
	var ret = document.createElement("video");
	ret.style.width = "100%";
	ret.style.height = "100%";
	ret.setAttribute("controls", "true");
	return ret;
    })();

    constructor(
	public el : HTMLElement,
	public source : string,
	public time : number = 0
    ) {
    }

    static snapshot(tW, tH, onSucces?, onError?: ()=>any)
    : void {
	var video  = VideoPlayer.video;
	var canvas = document.createElement("canvas");
	var ctx    = canvas.getContext("2d");
	var vW     = video.videoWidth;
	var vH     = video.videoHeight;
	var tW     = tW || vW;
	var tH     = tH || vH;
	var ratio  = vW / vH;
	var rH     = tW/ratio;
	var dH     = tH - rH;
	canvas.width = tW;
	canvas.height = tH;
	ctx.fillStyle = "rgba(0, 0, 0, 0)";
	ctx.fillRect(0, 0, tW, tH);
	try {
	    ctx.drawImage(video, 0, 0, vW, vH, 0, dH/2, tW, rH);
	    onSucces(canvas.toDataURL());
	} catch(err) {
	    if (onError) onError();
	}
    }

    private setBackground(url) {
	this.el.style.backgroundRepeat = "no-repeat";
	this.el.style.backgroundImage = "url("+url+")";
    }
    
    private deactivate()
    : void {
	VideoPlayer.snapshot(
	    this.el.clientWidth,
	    this.el.clientHeight,
	    (url) => {
		this.setBackground(url);
		this.el.removeChild(VideoPlayer.video);
		this.time = VideoPlayer.video.currentTime;
		this.source = VideoPlayer.video.src;
	    },
	    () => {
		console.log("Error creating snapshot!");
	    }
	);
    }
    
    private activate()
    : void {
	if (VideoPlayer.activePlayer) {
	    VideoPlayer.activePlayer.deactivate();
	}
	VideoPlayer.activePlayer = this;
	this.el.appendChild(VideoPlayer.video);
    }

    play(onReady? : () => any,
	 onError? : () => any) {
	var video = VideoPlayer.video;
	video.onerror = function() {
	    console.log("!");
	    if (onError) onError();
	};

	this.activate();
	video.src = this.source;

	// Broken under firefox?
	var readyFired = false;
	video.oncanplay = () => {
	    video.currentTime = this.time;
	    video.oncanplay = function() {
		if (onReady ) {
		    readyFired = true;
		    onReady();
		}
	    };
	}
    }

    pause() {
	VideoPlayer.video.pause();
    }

}

////////////////////////////////
// Upload menu
////////////////////////////////

class MenuItem {

    el : HTMLElement;
    mc : HammerManager;
    
    constructor(
	public label : string,
	public image : string,
	public menu : Menu
    ) {
	// Create the element ...
	this.el = (() => {
	    var elItem  = document.createElement("div");
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
	var downTime = false; // Have some downtime before being able to refire.
	mc.on("tap", (ev) => {
	    if (!downTime) {
		fireNewEvent("tap", this.el);
		setTimeout(() => {
		    downTime = false;
		}, 500);
	    }
	});
    }
}

class RemovableMenuItem extends MenuItem {

    transf : Transformable;
    
    constructor(
	label : string,
	image : string,
	menu : Menu
    ) {
	super(label, image, menu);

	this.transf = new Transformable(this.el);
	var panStartTrans : Trans;
	var panStartTrans : Trans;

	var mc = this.mc;
	mc.add(new Hammer.Pan());
	mc.on("panstart", (ev) => {
	    panStartTrans = this.transf.current;
	});
	mc.on("panmove", (ev) => {
            this.transf.translate(new Trans(ev.deltaX, 0).add(panStartTrans));
	    var w = this.el.offsetWidth;
	    this.el.style.opacity = String( 1 - ((1/w)*ev.deltaX) );
	    if (ev.deltaX > w) {
		mc.destroy();
		this.menu.removeItem(this);
	    }
	});
	mc.on("panend pancancel", (ev) => {
	    this.el.style.opacity = String(1);
	    this.transf.translate(new Trans(0, 0, 0, 1, 1));
	});
    }
}
 
class VideoItem extends RemovableMenuItem {

    constructor(
	label : string,
	image : string,
	menu : Menu
    ) {
	super(label, image, menu);
    }
}

class Menu {

    items : MenuItem[] = [];
    
    constructor(public el : HTMLElement) {
    }

    addItem(item : MenuItem)
    : void {
	this.el.appendChild(item.el);
	item.el.style.opacity = "0.0";
	$(item.el).animate({
	    opacity: 1.0
	}, 500);
	this.items.push(item);
	fireNewEvent("addedItem", this.el, {item: item});
    }

     removeItem(item : MenuItem)
    : boolean {
	if (this.items.indexOf(item) > -1) {
	    this.items = this.items.filter((x : MenuItem) => (x !== item));
	    this.el.removeChild(item.el);
	    fireNewEvent("removedItem", this.el, {item: item});
	    return true;
	}
	return false;
    }
}

class VideoMenu extends Menu {

    constructor(el : HTMLElement) {
	super(el);

	var createFileInput = () => {
	    var el = document.createElement("input");
	    el.type = "file";
	    el.onchange = () => {
		var split = el.value.split("\\");
		var label = split[split.length-1];
		this.addVideo(URL.createObjectURL(el.files[0]), label);
		// Create a new FileInput directly so the same file can
		// be selected multiple times.
		fileInput = createFileInput();
	    };
	    return el;
	};

	var fileInput = createFileInput();
	
	var addVideoButton = (() => {
	    var el = document.createElement("div");
	    var item = new MenuItem("add video", "", this);
	    item.el.classList.add("addVideo");
	    item.el.addEventListener("tap", (event) => {
		fileInput.click();
	    });
	    return item;
	})();
	
	this.addItem(addVideoButton);
    }

    addVideo(
	url : string,
	label : string)
    : void {
  	var el = document.createElement("div");
	var player = new VideoPlayer(document.createElement("div"), url, 10);
	player.play(() => {
	    var item = new VideoItem(label, "", this);
	    super.addItem(item);
	    VideoPlayer.snapshot(null, null, (image) => {
		var el = item.el;
		el.style.backgroundImage = "url(" + image + ")";
		el.style.backgroundRepeat = "no-repeat";
		el.style.backgroundSize = "100%";
		el.style.backgroundPosition = "center";
		player.pause();

	    }, () => {
		fireNewEvent("error", this.el, {url: url})
 	    })
	}, () => {
	    // FIXME, does not fire.
	    fireNewEvent("error", this.el, {url: url})
	});
    }
}

////////////////////////////////
// Fan
////////////////////////////////

class FanItem {
    transf : Transformable;
    constructor(public el : HTMLElement) {
	this.transf = new Transformable(el);
    }
}

class DraggableFanItem extends FanItem {
    mc : HammerManager;
    constructor(el : HTMLElement) {
	super(el);
	var mc = new Hammer.Manager(el, {
	    preventDefault: true
	});
	mc.add(new Hammer.Pan());
	var that = this;
	var panStartTrans : Trans;
	mc.on("panstart", function(ev) {
	    ev.preventDefault();
	    panStartTrans = that.transf.current;
	    that.onStart(ev);
	});
	mc.on("panmove", function(ev) {
	    ev.preventDefault();
	    that.transf.translate(new Trans(ev.deltaX, ev.deltaY).add(panStartTrans));
	    that.onMove(ev);
	});
	mc.on("panend pancancel", function(ev) {
	    ev.preventDefault();
	    that.onEnd(ev);
	});
	this.mc = mc;
    }

    onStart(ev : HammerInput)
    : void {
    }
    
    onMove(ev : HammerInput)
    : void {
    }

    onEnd(ev : HammerInput)
    : void {
    }
}

class ManipulatableFanItem extends FanItem {
}

class RemovableFanItem extends DraggableFanItem {
    public oldTrans : Trans;
    constructor(el : HTMLElement, public fan : Fan) {
	super(el);
    }

    onMove(ev : HammerInput) {
	super.onMove(ev);
	var distance = this.el.offsetWidth;
	this.el.style.opacity = String(1-(ev.distance/distance));
	if (ev.distance >= distance) {
	    this.mc.destroy();
	    this.fan.removeItem(this);
	}
    }

    onStart(ev : HammerInput)
    : void {
	this.oldTrans = this.transf.current;
    }
    
    onEnd(ev : HammerInput)
    : void {
	this.el.style.opacity = "1";
	this.transf.translate(this.oldTrans);
    }
}

class Fan {

    items : FanItem[] = [];
    itemsPlaced : number = 0;
    el : HTMLElement = document.createElement("div");
    _maxItems : number;
    _lineFunc : (length : number) => Trans[];

    constructor(
	public lineFunc : (length : number) => Trans[],
	maxItems : number,
	public onFull? : (fan : Fan) => any,
	public onRoomAgain? : (fan : Fan) => any,
	public animationInterval : number = 20,
	public animationSteps : number = 20) {
	this._maxItems = maxItems;
    }
    
    private placeItems(onPlaced? : () => any)
    :void {
	var points = this.lineFunc(this.items.length);
	var that = this;
	this.itemsPlaced = 0
	var that = this;
	this.items.forEach(function(item, c) {
	    item.transf.animate(points[c],
				that.animationSteps,
				that.animationInterval,
				function (transf : Transformable) {
				    that.itemsPlaced++;
				    if (that.itemsPlaced == that.items.length
					&& onPlaced) onPlaced();
				});
	});
    }
    
    addItem(item : FanItem)
    :void {
	if (this.items.length < this.maxItems) {
	    this.items.push(item);
	    this.el.appendChild(item.el);
	    this.placeItems();
	    if (this.items.length == this.maxItems) {
		if (this.onFull) this.onFull(this);
	    }
	}
    }
    
    removeItem(item : FanItem)
    : void {
	this.items = this.items.filter((b) => item !== b);
	this.el.removeChild(item.el);
	this.placeItems();
	if (this.isFull()) {
	    if (this.onRoomAgain) this.onRoomAgain(this);
	}
    }
    
    swapItem(oldItem : FanItem, newItem : FanItem)
    : boolean {
	this.items = this.items.map((item) => item === oldItem ? newItem : item);
	this.el.removeChild(oldItem.el);
	this.el.appendChild(newItem.el);
	// Keeps animating after swap, FIXME: Steps will be off.
	newItem.transf.translate(oldItem.transf.target);
	return true;
    }
    
    swapLineFunc(func : (length : number) => Trans[],
		 onPlaced? : () => any)
    : void {
	this.lineFunc = func;
	this.placeItems(onPlaced);
    }

    isFull()
    : boolean {
	return this.items.length >= this.maxItems-1;
    }
    
    set maxItems(v : number) {
	var wasFull = this.isFull();
	this._maxItems = v;
	if (wasFull && ! this.isFull()) {
	    if (this.onRoomAgain) this.onRoomAgain(this);
	}
    }

    get maxItems()
    : number {
	return this._maxItems;
    }
    
}

function makeSimpleLineFunc(width : number)
: (length : number) => Trans[] {
    return function(count : number)
    : Trans[] {
	var transs = [];
	for (var i=0; i<count; i++) {
	    transs.push(new Trans((width/count)*i,
				  0, 0, 1, 1));
	}
	return transs;
    }
}

function makeCircleFunc(radius : number,
			itemProCircle : number,
			angle : number = 0)
: (length : number) => Trans[] {
    return function(count : number)
    : Trans [] {
	var transs = []
	var d = (Math.PI*2) / itemProCircle;
	var a = (Math.PI*4) + (angle * (Math.PI/180));
	for (var i=0; i<count; i++) {
	    var x = Math.cos((d*i)+a) * radius;
	    var y = Math.sin((d*i)+a) * radius;
	    transs.push(new Trans(x, y, d*i*(180/Math.PI), 1, 1));
	}
	return transs;
    }
}

////////////////////////////////
// FanButton
////////////////////////////////

class FanButton {

    el : HTMLElement;
    transf : Transformable;
    fan : Fan;
    
    constructor(
	public parent : HTMLElement,
	public transFunc : (el : HTMLElement, parent : HTMLElement) => Trans,
	public radiusRatio : number,
	public fromAngle : number,
	public toAngle : number,
	public maxItems : number
    ) {
	assert(fromAngle < toAngle, "fromAngle < toAngle");
	this.el = document.createElement("div");
	this.el.classList.add("button");
	this.parent.appendChild(this.el);
	this.transf = new Transformable(this.el);
	this.fan = new Fan(
	    this.fanCircleFunc(),
	    maxItems
	);
	this.parent.appendChild(this.fan.el);
	window.addEventListener("resize", () => {
	    this.place();
	});
	this.place();
	/* TODO: Implement as methods */
	this.el.onclick = () => {
	    var el = document.createElement("div");
	    el.classList.add("fanItem");
	    var item = new RemovableFanItem(el, this.fan);
	    this.fan.addItem(item);
	};
    }
    
    private fanCircleFunc()
    : (length : number) => Trans[] {
	return makeCircleFunc(
	    this.el.offsetWidth * this.radiusRatio,
	    (this.maxItems-1) * (360 / (this.fromAngle - this.toAngle)),
	    this.fromAngle
	);
    }

    private place()
    : void {
	this.transf.translate(this.transFunc(this.el, this.parent));
	this.fan.swapLineFunc(this.fanCircleFunc());	
    }
};

////////////////////////////////
// Buttons
////////////////////////////////

// class Buttons {

//     buttons : HTMLElement[];
//     trs : Transformable[];
//     fans : Fan[];
    
//     constructor(public el : HTMLElement) {
// 	this.buttons = [].slice.call(el.getElementsByClassName("button"));
// 	this.trs = this.buttons.map((button) => new Transformable(button));
// 	this.placeButtons();
// 	window.addEventListener("resize", () => {
// 	    this.placeButtons();
// 	});
// 	this.buttons.forEach((button, i) => {
// 	    var fan = new Fan(makeCircleFunc(100, 40, 0), 10);
// 	    this.el.appendChild(fan.el);
// 	    button.onclick = () => {
// 		var el = document.createElement("div");
// 		el.classList.add("fanItem");
// 		var item = new RemovableFanItem(el, fan);
// 		fan.addItem(item);
// 	    };
	    
// 	});
//     }

//     placeButtons() {
// 	var positions = this.positions();
// 	this.trs.forEach((tr, i) => {
// 	    var x = positions[i][0];
// 	    var y = positions[i][1];
// 	    tr.translate(new Trans(x, y, 0, 1, 1));
// 	});
//     }
    
//     positions() {
// 	var bW = this.buttons[0].offsetWidth;
// 	var bH = this.buttons[0].offsetHeight;
// 	var cW = bW/2;
// 	var cH = bH/2;
// 	var w  = this.el.offsetWidth;
// 	var h  = this.el.offsetHeight;       
// 	return [
// 	    // Top left
// 	    [0, 0],
// 	    // Top center
// 	    [(w/2)-cW, 0],
// 	    // Top right
// 	    [w-bW, 0],
// 	    // Bottom left
// 	    [0, h-bH],
// 	    // Bottom center
// 	    [(w/2)-cW, h-bH],
// 	    // Bottom right
// 	    [w-bW, h-bH]
// 	];
//     }

// }

////////////////////////////////
// Test
////////////////////////////////


window.onload = () => {
    var el = document.getElementById("upload");
    var menu = new VideoMenu(el);
    menu.addItem(new RemovableMenuItem("Test", "", menu));

    menu.el.addEventListener("error", (event) => {
	console.log((<any>event).detail);
    });

    var buttons = document.getElementById("buttons");

    var fanButton = new FanButton(buttons, Positions.topLeft, 1, 180, 360, 5);
    buttons.appendChild(fanButton.el);

    var fanButton2 = new FanButton(buttons, Positions.topRight, 1, 180, 360, 5);
    buttons.appendChild(fanButton2.el);

    //    new Buttons(document.getElementById("stage"));
};
