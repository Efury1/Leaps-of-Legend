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

30/08/2026
- Add double jump
- Make sure poision and bubble don't appear on menu
- Make sure poision disapears when it is hit with bubble
- If user gets to 15 and they don't have points do game over

31/08/2026
Double jump
- We track whether a jump in reserve wiht canDoubleJump
- set canDoubleJump = true in checkForlanding and checkForFloorHit, that way a third jump is blocked
- The else if (verticalVelocity !== 0 && canDpubleJump === true) branch allows you to jump, then blocks third jump

Updating Menu
- fillText does not wrap text. It draws exactly the string you give it. Therefore we needed to do an array of strings
- We needed to do a foreach for lines. Each lines needs to be +25 from the last
- For const textWidth = ctx.measureText(text).width we are calling lines inside, but .measureText() on soemthign isn't a string. Therefore, JS coercces it to a string first joinging all 4 lines together without commas into one giant string, then measure the width of that, so that needs to be fixed. That has been done now we need to do it for the hiehgt

Todo
- Have a better starting screen
- Have text that writes out one by one explaining the story before playing
- Have 3 levels
- level 2 has platform that can break
- level 3 has falling platforms as well 

- In top menu put
- Princess status: presumary fine
- Moods should change with lives, if it is one life do hooves sore

- Instead of winning put
- You have achieved: Platonic Ideal of Jumping. The princess weeps with gratitude... and word travels fast. Other princesses have heard about you. They're calling. They need a hero. Or at least someone who can jump good. Go to level 2
- Level 3 end screen. The Princess is rescued, deeply confused about the falling potions situation. Word has now reached the whole kingdom. Every princess who has ever needed rescuing is doing fine. You have officially achieved: Main Character Energy. There is nothing left to jump toward. You have peaked.

Play again screen:
-Alicorn Points: [score] (a solid effort, statistically speaking)
- Instead of play again do: One more jump

- Screen after pressing play
Legend says the unicorn's horn, the alicorn, can cure any curse. Unfortunately, horn magic doesn't just appear, it has to be earned, one questionable platform jump at a time. Time to prove it.

- Unicorns should mutter when playing. something lieke what is below. Could tie this to the bubble mechanism. 

const unicornMutterings = [
  'Ugh, why is this so hard',
  'Why is the princess all the way up there',
  'Nobody said anything about this many stairs',
  'I am a MAGICAL creature, not a mountain goat',
  'This horn better be worth it',
  'Whose idea was this curse anyway',
  'I could be grazing right now',
  'Is this really the only way to cure a curse',
  'Cool cool cool, more platforms, love that for me'
];