# Radio Player
## Description
Website for listening to Online Radios
~~I wanted single file so i can have it on my desktop without the need of hosting it on webserver.~~ I changed my mind and i will separate RadioPlayer into more files becouse i can make shortcut to index.html or host it on github pages. Also you can use the radios.m3u file to play radios in VLC for example or use the jellyfin version. I live in Czech Republic so i will have mostly czech radios on this website.

## Disclaimer
This thing is in development. (It may be forever)

## TODO
- Better design
- ~~Dark Theme~~
- ~~Black Theme~~
- ~~Blue Theme~~
- Make browser rember the slected theme and autoplay settings (also bitrate when it will be implemented).
- Make quality selector (changes the bitrate). (Probably will make me rewrite audio source switching)
- Make sources tab (with links to icecast sources and/or official websites).
- Choose a license.
- Maybe show song playing right now (probably hard af for n00b like me).
- Remove few console.log("unnecesary");
- Sort radio staions alphabeticaly.

## Issues
- ~~When switching radio stations reload audio source.~~
- When unpausing radio station reload audio source (It plays cached bit over and over). (For that i would probably need to make my own controls for the player) (or make empty file and name it silence.mp3 and onpause change source to it and on play change it back)
- ~~Add time after link so it seems like new link.~~

## Code Snipppets

### Links
- [This website on Github Pages](https://miraficus.github.io/RadioPlayer/)

### Links (Just for me)
- [language switch](https://www.google.com/search?q=javascript+language+switch&hl=cs&source=hp&ei=K6S9YonFAdT1gQab7KmwAg&iflsig=AJiK0e8AAAAAYr2yO0TX0iXic_dyw-Rj01IMeEqSGGCY&oq=javascrpit+lang&gs_lcp=Cgdnd3Mtd2l6EAEYBTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIGCAAQHhAWMgYIABAeEBYyBggAEB4QFjIGCAAQHhAWOgoIABDqAhC0AhBDOhAILhDHARDRAxDqAhC0AhBDOhQIABDqAhC0AhCKAxC3AxDUAxDlAjoFCC4QgAQ6CwgAEIAEELEDEIMBOg4ILhCABBCxAxDHARCjAjoICC4QgAQQsQM6CAgAEIAEELEDOggILhCxAxCDAToLCC4QgAQQsQMQgwE6BAgAEEM6BAguEEM6BwgAELEDEEM6DgguEIAEELEDEIMBENQCOgUIABCABDoECAAQCkoFCDsSATFQqQRYkjVghFBoAHAAeACAAdUCiAGFD5IBCDExLjIuMi4xmAEAoAEBsAEK&sclient=gws-wiz)
- [PWA Icon Builder](https://www.pwabuilder.com/imageGenerator)
- [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/)

## License
I dont have one yet.
