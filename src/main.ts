/// <reference path="./video.ts" />
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

function launchIntoFullscreen(element) {
  if(element.requestFullscreen) {
    element.requestFullscreen();
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if(element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

function exitFullscreen() {
    if((<any>document).exitFullscreen) {
	(<any>document).exitFullscreen();
    } else if((<any>document).mozCancelFullScreen) {
	(<any>document).mozCancelFullScreen();
    } else if((<any>document).webkitExitFullscreen) {
	(<any>document).webkitExitFullscreen();
  }
}

////////////////////////////////
// Positions
////////////////////////////////

interface ButtonInit {
    trans      : Trans;
    id         : string;
    angles     : number[];
}

class ButtonInits {

    static inits = [
	{trans: ButtonInits.topLeft,
	 id: "topLeft",
	 angles: [180, 360]},
	{trans: ButtonInits.topCenter,
	 id: "topCenter",
	 angles: [180, 360]},
	{trans: ButtonInits.topRight,
	 id: "topRight",
	 angles: [180, 360]},
	{trans: ButtonInits.bottomLeft,
	 id: "bottomLeft",
	 angles: [180, 360]},
	{trans: ButtonInits.bottomCenter,
	 id: "bottomCenter",
	 angles: [180, 360]},
	{trans: ButtonInits.bottomRight,
	 id: "bottomRight",
	 angles: [180, 360]}
    ];
    
    static topLeft(el : HTMLElement, parent : HTMLElement)
    : Trans {
	return new Trans(0, 0, 0, 1, 1);
    }
    static topCenter(el : HTMLElement, parent : HTMLElement)
    : Trans {
	var w  = parent.offsetWidth;
	var bW = el.offsetWidth;
	var cW = bW/2;
	return new Trans((w/2)-cW, 0, 0, 1, 1);
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

    static fromCurrentVideo(el : HTMLElement) {
	assert(VideoPlayer.activePlayer, "oldPlayer");
	var ret = new VideoPlayer(
	    el,
	    VideoPlayer.video.src,
	    VideoPlayer.video.currentTime);
	VideoPlayer.snapshot((url) => {
	    ret.setBackground(url);
	});
	return ret;
    }
    
    static snapshot(onSucces)
    : void {
	var video  = VideoPlayer.video;
	var canvas = document.createElement("canvas");
	var ctx    = canvas.getContext("2d");
	var vW     = video.videoWidth;
	var vH     = video.videoHeight;
	var ratio  = vW / vH;
	var rH     = vW/ratio;
	var dH     = vH - rH;
	canvas.width = vW;
	canvas.height = vH;
	ctx.fillStyle = "rgba(0, 0, 0, 0)";
	ctx.fillRect(0, 0, vW, vH);
	ctx.drawImage(video, 0, 0, vW, vH, 0, dH/2, vW, rH);
	onSucces(canvas.toDataURL());
    }

    private setBackground(url) {
	this.el.style.backgroundSize = "100%";
	this.el.style.backgroundPosition = "center";
	this.el.style.backgroundRepeat = "no-repeat";
	this.el.style.backgroundImage = "url("+url+")";
    }
    
    private deactivate()
    : void {
	assert(VideoPlayer.activePlayer === this,
	      "Player to deactivate needs to be active.");
	VideoPlayer.snapshot((url) => {
		this.setBackground(url);
		if (VideoPlayer.video.parentElement) {
		    VideoPlayer.video.parentElement.removeChild(VideoPlayer.video);
		}
		this.time = VideoPlayer.video.currentTime;
		this.source = VideoPlayer.video.src;
	});
    }

    activate(onDone?)
    : void {
	var video = VideoPlayer.video;
	if (VideoPlayer.activePlayer) {
	    VideoPlayer.activePlayer.deactivate();
	}
	video.src = this.source;

	var cont = () => {
	    video.currentTime = this.time;
	    video.oncanplay = () => {
		video.oncanplay = null;
		VideoPlayer.activePlayer = this;
		this.el.appendChild(VideoPlayer.video);
		if (onDone) onDone();
	    };
	    video.onerror = () => {
		video.onerror = null;
		throw("VideoPlayer::activate()");
	    };
	}
	video.src = this.source;
	video.onloadstart = () => { 
	    if (video.readyState >= 1) {
		cont();
	    } else {
		video.onloadedmetadata = () => {
		    video.onloadedmetadata = null;
		    cont();
		};
	    }
	}
    }

    play(onDone?) {
	this.activate(onDone);
    }

    pause()
    : void {
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
	    ev.preventDefault();
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
	this.mc.add(new Hammer.Pan({preventDefault: true}));
	this.mc.on("panstart", (ev) => {
	    panStartTrans = this.transf.current;
	});
	this.mc.on("panmove", (ev) => {
            this.transf.translate(new Trans(ev.deltaX, 0).add(panStartTrans));
	    var w = this.el.offsetWidth;
	    this.el.style.opacity = String( 1 - ((1/w)*ev.deltaX) );
	});
	this.mc.on("panend pancancel", (ev) => {
	    this.el.style.opacity = String(1);
	    this.transf.translate(new Trans(0, 0, 0, 1, 1));
	    var w = this.el.offsetWidth;
	    if (ev.deltaX > w) {
		this.mc.destroy();
		this.menu.removeItem(this);
	    }
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
	    item.el.parentNode.removeChild(item.el);
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
	    var item = new MenuItem("video toevoegen", "", this);
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
	var player = new VideoPlayer(document.createElement("div"), url, 20);
	player.play(() => {
	    var item = new VideoItem(label, "", this);
	    item.el.addEventListener("tap", () => {
		// FIXME: Just a test...
		var el = document.getElementById("video");
		var player = new VideoPlayer(el, url, 0);
		player.play();
	    });
	    VideoPlayer.snapshot((image) => {
		var el = item.el;
		el.style.backgroundImage = "url(" + image + ")";
		el.style.backgroundRepeat = "no-repeat";
		el.style.backgroundSize = "100%";
		el.style.backgroundPosition = "center";
		super.addItem(item);
//		player.pause();
	    });
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
    
    onPlaced() {
    }
}

class ManipulatableFanItem extends FanItem {

    mc : HammerManager;
    
    constructor(el : HTMLElement) {
	super(el);
    }
   
    onPlaced() {
	this.mc = new Hammer.Manager(this.el, {
	    preventDefault: true
	});
	this.mc.add(new Hammer.Pan());
	this.mc.add(new Hammer.Rotate());
	this.mc.add(new Hammer.Pinch());
	var panStartTrans : Trans;
	this.mc.on("panstart rotatestart pinchstart", (ev) => {
	    console.log("!");
	    panStartTrans = this.transf.current;
	});
	this.mc.on("panmove rotatemove pinchmove", (ev) => {
	    this.transf.translate(
		new Trans(panStartTrans.px + ev.deltaX,
			  panStartTrans.py + ev.deltaY,
			  panStartTrans.angle + ev.rotation,
			  panStartTrans.sx * ev.scale,
			  panStartTrans.sy * ev.scale));
	});
	this.mc.on("panend rotateend rotatecancel pinchend pinchcancel", (ev) => {
	});
    }
}

class RemovableFanItem extends FanItem {

    mc : HammerManager;

    constructor(el : HTMLElement, public fan : Fan) {
	super(el);
    }

    onPlaced() {
	this.mc = new Hammer.Manager(this.el, {
	    preventDefault: true
	});
	this.mc.add(new Hammer.Pan());
	var panStartTrans : Trans;
	this.mc.on("panstart", (ev) => {
	    panStartTrans = this.transf.current;
	});
	this.mc.on("panmove", (ev) => {
	    this.transf.translate(new Trans(ev.deltaX, ev.deltaY).add(panStartTrans));
	    var distance = this.el.offsetWidth;
	    this.el.style.opacity = String(1-(ev.distance/distance));
	});
	this.mc.on("panend pancancel", (ev) => {
	    var distance = this.el.offsetWidth;
	    this.el.style.opacity = "1";
	    this.transf.translate(panStartTrans);

	    if (ev.distance >= distance) {
		this.mc.destroy();
		this.fan.removeItem(this);
	    }
	});
	this.mc.on("panend pancancel", (ev) => {
	    var distance = this.el.offsetWidth;
	    this.el.style.opacity = "1";
	    this.transf.translate(panStartTrans);

	    if (ev.distance >= distance) {
		this.mc.destroy();
		this.fan.removeItem(this);
	    }
	});
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
	this.items.forEach(function(item, c) {
	    item.transf.animate(points[c],
				that.animationSteps,
				that.animationInterval,
				function (transf : Transformable) {
				    item.onPlaced();
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
	if (item.el.parentElement) {
	    item.el.parentElement.removeChild(item.el);
	}
	this.placeItems();
	if (this.isFull()) {
	    if (this.onRoomAgain) this.onRoomAgain(this);
	}
    }
    
    swapItem(oldItem : FanItem, newItem : FanItem)
    : boolean {
	this.items = this.items.map((item) => item === oldItem ? newItem : item);
	oldItem.el.parentElement.removeChild(oldItem.el);
	this.el.appendChild(newItem.el);
	// Keeps animating after swap, FIXME: Steps will be off.
	newItem.transf.translate(oldItem.transf.target);
	newItem.onPlaced();
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
    expanded : boolean = false;
    
    constructor(
	public parent : HTMLElement,
	public transFunc : (el : HTMLElement, parent : HTMLElement) => Trans,
	public radiusRatio : number,
	public expandedRadiusRatio : number,
	public fromAngle : number,
	public toAngle : number,
	public maxItems : number
    ) {
	assert(fromAngle < toAngle, "fromAngle < toAngle");
	this.el = document.createElement("div");
	this.el.classList.add("button");
	this.el.classList.add("placeHolder");
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
	    /* TODO: Quick and dirty */
	    this.el.classList.remove("placeHolder");
	    this.el.onclick = () => {
		var el = document.createElement("div");

		var item = new RemovableFanItem(el, this.fan);
		// Make appear come from the center of the stage...
		var centerX = (this.parent.offsetWidth /2)-(this.el.offsetWidth /2);
		var centerY = (this.parent.offsetHeight/2)-(this.el.offsetHeight/2);
		item.transf.translate(new Trans(centerX, centerY, 0, 1, 1));
		// Make elements slowly fade in...
		el.style.opacity = "0.0";
		$(el).animate({
		    opacity: "1.0"
		}, 500);
		this.fan.addItem(item);
		var player = VideoPlayer.fromCurrentVideo(el);
		el.classList.add("fanItem");
		el.onclick = () => player.activate(()=>{});
	    };
	};
    }

    expand() {
	if (!this.expanded) {
	    this.expanded = true;
	    this.el.onclick = null;
	    this.fan.swapLineFunc(
		this.fanCircleFunc(), () => {
		    this.fan.items.forEach((item) => {
			var el = <HTMLElement>item.el.cloneNode(false);
			el.classList.add("fanItem");
			var newItem = new ManipulatableFanItem(el);
			this.fan.swapItem(item, newItem);
		    });
		}
	    );
	}
    }
    
    private fanCircleFunc()
    : (length : number) => Trans[] {
	var radiusRatio = this.expanded ? this.expandedRadiusRatio : this.radiusRatio;
	var func =  makeCircleFunc(
	    this.el.offsetWidth * radiusRatio,
	    (this.maxItems-1) * (360 / (this.fromAngle - this.toAngle)),
	    this.fromAngle
	);
	return (length : number) : Trans[] => {
	    var ret = func(length);
	    var ttrans = this.transFunc(this.el, this.parent);
	    return ret.map((trans) : Trans => {
		return new Trans(trans.px + ttrans.px,
				 trans.py + ttrans.py,
				 trans.angle, trans.sx, trans.sy);
	    });
	}
    }

    private place()
    : void {
	this.transf.translate(this.transFunc(this.el, this.parent));
	this.fan.swapLineFunc(this.fanCircleFunc());	
    }
};

////////////////////////////////
// Side bar
////////////////////////////////

class SideBar {

    transf : Transformable;
    _expanded : boolean = false;
    dragRatio = .95;

    constructor(public el : HTMLElement) {
	this.transf = new Transformable(el);
	window.addEventListener("resize", () => {
	    this.place();
	});
	this.place();
	var mc = new Hammer.Manager(el);
	var panStartTrans;
	mc.add(new Hammer.Pan({
	    preventDefault: true,
	    treshold: 20
	}));
	mc.on("panstart", (ev) => {
	    panStartTrans = this.transf.current;
	});
	mc.on("panmove", (ev) => {
	    if ((!this._expanded && ev.deltaX > 0) ||
		(this._expanded  && ev.deltaX < 0)) {
		var w = el.offsetWidth*this.dragRatio;
		var x = Math.min(ev.deltaX, w);
		this.transf.translate(new Trans(x, 0).add(panStartTrans));
	    }
	});
	mc.on("panend pancancel", (ev) => {
	    var w = el.offsetWidth*this.dragRatio;
	    this.expanded = (this.transf.current.px == 0);
	});


    }

    place() {
	var w = this.el.offsetWidth;
	var x = this._expanded ? 0 : -w*this.dragRatio;
	this.transf.animate(
	    new Trans(x, 0, 0, 1, 1), 20, 20
	);
	// Disable buttons when not expaned
	console.log("!");
	[].forEach.call(this.el.children, el => {
	    el.style.pointerEvents = this._expanded ? "auto" : "none";
	});
    }

    set expanded(v : boolean) {
	this._expanded = v;
	this.place();
    }

    get expanded()
    : boolean {
	return this._expanded;
    }
    

}

////////////////////////////////
// App
////////////////////////////////

class App {

    sideBar : SideBar;
    buttons : FanButton[];
    video   : VideoPlayer;

    constructor() {
	var stage = document.getElementById("stage");
	this.sideBar = new SideBar(document.getElementById("sideBar"));
	this.buttons = ButtonInits.inits.map(init => {
	    var button = new FanButton(stage, init.trans,
				       1, 1.5,
				       init.angles[0], init.angles[1], 5);
	    button.el.id = init.id;
	    stage.appendChild(button.el);
	    return button;
	});
    }
}

////////////////////////////////
// Test
////////////////////////////////

var buttons;
var player;
window.onload = () => {

    var el    = document.getElementById("sideBar");
    var stage = document.getElementById("stage");
    var menu = new VideoMenu(el);
    var sideBar = new SideBar(el);

    var exit = document.getElementById("exit");
    var fullFunc = function() {
	exit.innerHTML = "volledig scherm";
	exit.onclick = () => {
	    launchIntoFullscreen(document.documentElement);
	    exitFullFunc();
	};
    }
    var exitFullFunc = function() {
	exit.innerHTML = "volledig scherm sluiten";
	exit.onclick = () => {
	    exitFullscreen();
	    fullFunc();
	};
    };
    fullFunc();
    document.body.onkeypress = () => sideBar.expanded = !sideBar.expanded;

    buttons = ButtonInits.inits.map((init) => {
	var button = new FanButton(stage, init.trans,
				   1, 1.5,
				   init.angles[0], init.angles[1], 5);
	button.el.classList.add(init.id);
	stage.appendChild(button.el);
	return button;
    });

    // Prevent history swipe
    document.addEventListener("touchmove", (ev) => {
	ev.preventDefault();
    });
    document.addEventListener("wheel", (ev) => {
	ev.preventDefault();
    });

};
