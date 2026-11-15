# GmCat, in the open

Hi! This is the code behind GmCat's free, public sites. GmCat is a pixel cat who says gm to the world,
and these sites are about kindness, creativity and being a good neighbor on the internet.

We publish this so anyone can look inside and check that we do what we say, especially about privacy.

## What's here

| Folder | Site | What it is |
|---|---|---|
| `sites/ai.gmcat.io` | [ai.gmcat.io](https://ai.gmcat.io) | Plain-language articles about AI and people. No ads, nothing for sale. |
| `sites/kind.gmcat.io` | [kind.gmcat.io](https://kind.gmcat.io) | Daily kindness missions and kind cards to send to someone. |
| `sites/art.gmcat.io` | [art.gmcat.io](https://art.gmcat.io) | The GmCat art gallery and wallpapers, free to download. |
| `sites/tools.gmcat.io` | [tools.gmcat.io](https://tools.gmcat.io) | Small free tools that run entirely in your browser. |
| `sites/friends.gmcat.io` | [friends.gmcat.io](https://friends.gmcat.io) | Meet GmCat's friends. New friends appear here on the day they're revealed. |
| `server/insights` | | The visit counter, the only thing these sites send to our server. |
| `server/kind-mission` | | Picks the kindness mission of the day. |

The `sites` folders are exactly the files our server sends to your browser, copied from the live sites.

## Privacy, in plain words

- **Nothing is loaded from other companies.** No ad networks, no outside trackers, no outside fonts or scripts.
  Links to other sites (like X) only open when you click them.
- **No cookies, and nothing stored about you in your browser** by the visit counter.
- **We count visits, not people.** The counter records the page, the kind of device (phone, tablet, desktop)
  and where the visit came from (for example, a link on X).
- **Your IP address is never saved.** To estimate how many different visitors came in a day, the server mixes
  the IP address with a random value that is thrown away every day, so visitors can't be recognised the next day
  or traced back. See `server/insights/collector.py`.
- **Do Not Track and Global Privacy Control are respected.** If your browser sends them, nothing is counted at all.
  See `server/insights/insights.js`.
- **Old visit records are deleted automatically** after 400 days.
- The kind site is for all ages. It asks for no names, no e-mail and no accounts.

If you find anything here that doesn't match these words, please tell us (see below). That's why this is public.

## Say hi, ask, suggest

- Questions, ideas, kind words: open an **Issue** or a **Discussion**.
- Fixes and improvements are welcome as pull requests. See `CONTRIBUTING.md`.
- Found a security or privacy problem? Please report it privately. See `SECURITY.md`.

## Using this code and art

The **code** is free to reuse under the MIT license. The **GmCat characters and artwork** stay GmCat's;
you're welcome to download them for personal use, just not to sell them. Details in `LICENSE`.

gm 🐾
