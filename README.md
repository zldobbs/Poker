# Poker
A poker game built with [socket-io](https://socket.io) and [Vue](https://vuejs.org)
## Usage
Requires [Node.js](https://nodejs.org/)
`node main.js`
## Planned Implementations
* Implement the betting process
  * Functions for fold, check/call, bet/raise
* Improve UI and responsive design
  * Considering dark theme?
  * Need to create a new view for holding waiting players
* Implement MongoDB database
  * utilize authentication
* Host online for all to play and enjoy!
## Known Issues
Reflecting on this code base, I realize that my implementation has many flaws that could be improved upon. Namely the use of global variables should be scrapped for a better implementation of MVC and OOP concepts. I plan on someday revisiting the underlying architecture to create two objects TABLE and PLAYER.

The MVC architecture I currently have implemented is alright, but could definitely be more consistent and efficient. The file controller.js is the controller that communicates between the model (main.js) and the view (main.html - at this point in time).
