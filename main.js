import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let dots = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
    return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
    localStorage.clear();
}
else
{
    // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () =>
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
            init();
        }
    });

    window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
            init();
        }
    };

	function init ()
	{
        initialized = true;

        // add a short timeout because window.offsetX reports wrong values before a short period
        setTimeout(() => {
            setupScene();
            setupWindowManager();
            resize();
            updateWindowShape(false);
            render();
            window.addEventListener('resize', resize);
        }, 500)
    }

	function setupScene ()
	{
        camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);

        camera.position.z = 2.5;
        near = camera.position.z - .5;
        far = camera.position.z + 0.5;

        scene = new t.Scene();
        scene.background = new t.Color(0.0);
		scene.add( camera );

        renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
        renderer.setPixelRatio(pixR);

        world = new t.Object3D();
        scene.add(world);

        renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
    }

	function setupWindowManager ()
	{
        windowManager = new WindowManager();
        windowManager.setWinShapeChangeCallback(updateWindowShape);
        windowManager.setWinChangeCallback(windowsUpdated);

        // here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

        // this will init the windowmanager and add this window to the centralised pool of windows
        windowManager.init(metaData);

        // call update windows initially (it will later be called by the win change callback)
        windowsUpdated();
    }

	function windowsUpdated ()
	{
        updateNumberOfDots();
        // render the scene after updating windows
        render();
    }

	function updateNumberOfDots ()
	{
        let wins = windowManager.getWindows();

        // remove all dots
        dots.forEach((d) => {
            world.remove(d);
        })

        dots = [];

        // add new dots based on the current window setup
		for (let i = 0; i < wins.length; i++)
		{
            let win = wins[i];

            let c = new t.Color();
            c.setHSL(i * .3, 1.0, .5);

            let s = 100 + i * 50;
            let dotGeometry = new t.Geometry();
			for (let j = 0; j < 10000; j++)
			{
                let vertex = new t.Vector3();
                vertex.x = Math.random() * 2 - 1;
                vertex.y = Math.random() * 2 - 1;
                vertex.z = Math.random() * 2 - 1;
                vertex.normalize();
                vertex.multiplyScalar(s);
                dotGeometry.vertices.push(vertex);
            }
            let dotMaterial = new t.PointsMaterial({ color: c, size: 0.01 });
            let dotMesh = new t.Points(dotGeometry, dotMaterial);
            dotMesh.position.x = win.shape.x + (win.shape.w * .5);
            dotMesh.position.y = win.shape.y + (win.shape.h * .5);

            world.add(dotMesh);
            dots.push(dotMesh);
        }
    }

	function updateWindowShape (easing = true)
	{
        // storing the actual offset in a proxy that we update against in the render function
        sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
        if (!easing) sceneOffset = sceneOffsetTarget;
    }


	function render ()
	{
        let t = getTime();

        windowManager.update();


        // calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
        let falloff = .05;
        sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
        sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

        // set the world position to the offset
        world.position.x = sceneOffset.x;
        world.position.y = sceneOffset.y;

        let wins = windowManager.getWindows();


        // loop through all our dots and update their positions based on current window positions
		for (let i = 0; i < dots.length; i++)
		{
            let dot = dots[i];
            let win = wins[i];

            dot.position.x = win.shape.x + (win.shape.w * .5);
            dot.position.y = win.shape.y + (win.shape.h * .5);

            // add rotation animation based on time
            dot.rotation.x = t * 0.5;
            dot.rotation.y = t * 0.5;
        };

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }


    // resize the renderer to fit the window size
	function resize ()
	{
        let width = window.innerWidth;
        let height = window.innerHeight

        camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
        camera.updateProjectionMatrix();
        renderer.setSize( width, height );
    }
}


document.getElementById("addWindowBtn").addEventListener("click", addWindow);
document.getElementById("removeWindowBtn").addEventListener("click", removeWindow);
document.getElementById("refreshWindowBtn").addEventListener("click", refreshWindowBtn);


function addWindow() {
    // custom metadata for the new window
    let metaData = {foo: "bar"};
    // add a new window
    windowManager.init(metaData);

    // update dots array and add new dots to the scene
    let wins = windowManager.getWindows();
    // get the current number of dots
    let dotCount = dots.length;
    let lastIndex = wins.length - 1;
    // get the newly added window
    let win = wins[lastIndex];

    let c = new t.Color();
    // use dotCount instead of lastIndex
    c.setHSL(dotCount * .3, 1.0, .5);

    // calculate size based on the current number of dots
    let s = 100 + dotCount * 50;
    let dotGeometry = new t.Geometry();
    for (let j = 0; j < 10000; j++) {
        let vertex = new t.Vector3();
        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.normalize();
        vertex.multiplyScalar(s);
        dotGeometry.vertices.push(vertex);
    }
    let dotMaterial = new t.PointsMaterial({color: c, size: 0.01 });
    let dotMesh = new t.Points(dotGeometry, dotMaterial);
    dotMesh.position.x = win.shape.x + (win.shape.w * .5);
    dotMesh.position.y = win.shape.y + (win.shape.h * .5);

    world.add(dotMesh);
    dots.push(dotMesh);
}


function removeWindow() {
    let windows = windowManager.getWindows();
    if (windows.length > 0) {
        // remove the last window
        let removedWindow = windows.pop();

        // remove the corresponding dot from the scene
        world.remove(dots.pop());
        windowManager.removeWindow(removedWindow);
    }
}


function refreshWindowBtn() {
    // remove all windows except the first one
    const windows = windowManager.getWindows();
    for (let i = windows.length - 1; i > 0; i--) {
        windowManager.removeWindow(windows[i]);
    }
    // remove "/index.html" from the URL if it's present
    let url = window.location.href.replace(/\/index.html$/, '');

    // remove trailing slash if present
    url = url.replace(/\/$/, '');

    // navigate to the modified URL with "?clear=true"
    window.location.href = url + "?clear=true";
}
