# Radio Player
## Description
Website for listening to Online Radios. You can also use the radios.m3u or .pls files and listen to radios in VLC or other media player that supports theese files, or use the jellyfin version. I live in Czech Republic so i will have mostly Czech radios on this website.

## Disclaimer
This thing is in development. (It may be forever)

## TODO / Issues
- Better design
- ~~Dark Theme~~
- ~~Black Theme~~
- ~~Blue Theme~~
- Festive Themes (Add checkbox for festive themes. It would change color around Chrsitmas to red and on Haloween to orange for example)
- ~~Make browser remember the selected theme and autoplay settings (also bitrate when it will be implemented).~~
- Make quality selector (changes the bitrate). (Probably will make me rewrite audio source switching)
- ~~Make sources tab (with links to icecast sources and/or official websites).~~ (Simulator radio removed icecast sources website so i scrapped this idea)
- Choose a license.
- Show song playing right now.
- Show album cover for that song. (And find some api from which i can fetch theese)
- Fix radio station covers. (I took pngs and made them into svgs but i didnt give them any background and in dark mode it looks bad)
- Remove unnecessary console.log("");
- Sort radio stations. (Alphabeticaly and possibly by language)
- ~~When switching radio stations reload audio source.~~
- When unpausing radio station reload audio source (It plays cached bit over and over). (For that i would probably need to make my own controls for the player or make empty file and name it silence.mp3 and onpause change source to it and on play change it back)
- ~~Add time after link so it seems like new link.~~

## Code Snipppets 

### Links
- [This website on Github Pages](https://miraficus.github.io/RadioPlayer/)

### Links (Just for me)
- [Language Switch](https://www.google.com/search?q=javascript+language+switch&hl=cs&source=hp&ei=K6S9YonFAdT1gQab7KmwAg&iflsig=AJiK0e8AAAAAYr2yO0TX0iXic_dyw-Rj01IMeEqSGGCY&oq=javascrpit+lang&gs_lcp=Cgdnd3Mtd2l6EAEYBTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIGCAAQHhAWMgYIABAeEBYyBggAEB4QFjIGCAAQHhAWOgoIABDqAhC0AhBDOhAILhDHARDRAxDqAhC0AhBDOhQIABDqAhC0AhCKAxC3AxDUAxDlAjoFCC4QgAQ6CwgAEIAEELEDEIMBOg4ILhCABBCxAxDHARCjAjoICC4QgAQQsQM6CAgAEIAEELEDOggILhCxAxCDAToLCC4QgAQQsQMQgwE6BAgAEEM6BAguEEM6BwgAELEDEEM6DgguEIAEELEDEIMBENQCOgUIABCABDoECAAQCkoFCDsSATFQqQRYkjVghFBoAHAAeACAAdUCiAGFD5IBCDExLjIuMi4xmAEAoAEBsAEK&sclient=gws-wiz)
- [PWA Icon Builder](https://www.pwabuilder.com/imageGenerator)
- [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/)

## License
I dont have one yet.

