# Dev notepad: key handling and jump physics

## 19/08/26 — key handling basics

1. Auto repeat only tracks one key at a time. This is browser and OS level behaviour.
2. So we track held keys in a variable.
3. Keydown and keyup as a pair track the true state of the key.

Takeaway: the browser will not track held keys for you. State has to be tracked by hand.

## 20/08/26 — key state and first jump math

- A syntax error kept showing up (unexpected end of input). Fixed by using prettier.
- Pressed keys can be stored as boolean variables.
- A key handler function reads keyup events.
- Floor check: if distance is greater than or equal to the floor, land.
- Chose a platform instead of cloud logic, since the math felt easier to work out.
- Platforms are stored as an array, so new ones are easy to add.

### Jump height math

Goal: find how high the jump can go, using push speed and gravity.

1. Square the push. Push speed is 12, so 12 x 12 = 144.
2. Double the gravity. Gravity is 0.6, so 0.6 x 2 = 1.2.
3. Divide the square by the doubled gravity. 144 / 1.2 = 120.

Takeaway: 120px is the highest the jump can go. 90px was picked in practice, since it felt right for gameplay.

*See the diagram below for how push and gravity shape the jump arc.*

### Checking if the unicorn is over a platform

- A platform spans from `platform.x` to `platform.x + platform.width`.
- Example: `platform.x = 220`, `platform.width = 100`. The platform covers x = 220 to x = 320.
- So if `positionX = 250`, the check is `positionX > 220 && positionX < 320`.
- General rule for any platform: `positionX > platform.x && positionX < platform.x + platform.width`.
- Landing check: `(390 + distance) > platform.y`. This can't use equals, since gravity adds 0.6 each frame, and 0.6 keeps stacking into a decimal. So distance is never a clean number.

## 24/08/26 — scrolling and landing

- If the unicorn goes above the middle y position, scroll down.
- Once `restingPlatform` is set, gravity is skipped. This stops drift that could break the landing.

### Understanding gravity and motion

- Gravity speed grows by 0.6 per frame, every frame.
- `requestAnimationFrame()` tells the browser you want to run an animation.
- Gravity is a plain number (a scalar). Velocity is a vector, it has direction and speed.
- Adding gravity each frame adds to the velocity vector.