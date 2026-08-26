19/08/26
- Keyboard auto repeat typically only runs one key at a time. This is Browser/Os elvel behaviour. 
- Therefore, we track which key is held in a variable. 
- Keydown/keyup as a pair is a standard pattern because it tracks the actual physical state of the key

20/08/26
- Uncaught SyntaxError: Unexpected end of input, this kept happening, so I made sure I had prettier installed
- Pressed buttons can be defined and initalized with boolean variabled. 
- Set up key handler, this is a function that handlers the keyup events 
- if distance is greater then or equal to do we do floor check. 
but we need cloud logic now. 
- decided to go with a platform instead of the cloud, because I thought the math might be harder to figure out
- I did the platforms as an array, so it is easy to change. 
- Some thing with the platform is you had to think about the jump. and the heightest point. The speed it pushes of the ground is 12, and the gravity is 0.6 (How fast it gets pulled down)

Square the push 
In physics, speed energy is not just speed. 
It is speed times itself. 
1. 12 x 12 = 144

Double the gravity
Height uses gravity too. But the formula for
it has half of it. 
To cancel that out we double gravity instead
2. 0.6 x 2 = 1.2

Divide
Then dividing across the pull or energy
3. 144 / 1.2 = 120

So, 120 is the ceiling but to make it easier I picked 90px

- Need to compare the unicorn to see if it matches anything in the platform array. 
The unicorn is only above a platform if its x position ovrlatp the platforms x range. 

and the platform is platform.x to platform.x + platform.width.

- For platform I had to ask myself if platofrm/x = 220 and platform.wdith = 100. That means the platform stretches form x = 220 to x = 320. 
That means is positionX = 250 the unicorn is over the platform/.positionX > 220 && positionX < 320. but we nede to make it work for all platofrms.
positionX > platform.x && positionX < platform.x + platform.width
- (390 + distance) > platform.y), it can't be qual because every 0.6 stacks up and adds 0.6 a decimal. so distance inherits the decimal. So, it is never a clean numebr.

24/08/2026
If unicorn goes abvoe middle y position scroll down.
Once restingPlatform is set, gravity gets skipped. This is so no drift is there to accidently invalidate the ladning


// understanding 
gravity speed growns by 0.6/frame every frame
requestAnimationFrame() method tells the browser that you wish to perform an animation.

per frame per frame. Gravity is a square. Velocity is a vector of your direction and your speed. 

When I have gravity its adding velocity in vector. 
