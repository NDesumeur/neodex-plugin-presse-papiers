# Presse-papiers (Clipboard)

The history of everything you copy in Windows, kept in NeoDex: search it, pin what you reuse often and copy any item again in one click. **Ctrl+Alt+H**, from anywhere, opens a small list that pastes directly into the app you are in.

*Version française : [README.md](README.md)*

## Paste directly (new in 1.1.0)

Ctrl+Alt+H opens a small list over the app you are in: type to search, Enter pastes directly, without formatting. Copied images are kept too.

## How it works

The plugin reads the Windows clipboard every second, even when NeoDex is in the background. Each new text copied, in any application, is added to the top of the history with the time of the copy ("just now", "5 min ago"…).

- Copying a text that is already there moves it back to the top instead of creating a duplicate.
- What was already copied when NeoDex started does not count.
- Text (up to 20,000 characters per item) and images are kept, not files.

## Using the history

- **Click** an item: it is copied back to the clipboard, ready to paste.
- **Pin**: the item moves to the **Pinned** section at the top and is never removed on its own. **Unpin** puts it back in **Recent**.
- **Search**: filters the history as you type.
- **Pause**: nothing you copy is recorded while the pause is on.
- **Clear all**: empties the history, except pinned items (after confirmation).

## Privacy

- The last 200 texts and 40 images are kept; beyond that, the oldest unpinned ones go.
- Anything a password manager marks as "do not keep" (the standard Windows signal for copied passwords) is never recorded.
- Everything stays on your computer.

## Permission

The plugin needs the **system pane** permission to read the clipboard in the background; without it, it says so and shows where to grant it (Permissions).

## Data and sync

Nothing is synced: the history belongs to each PC and stays in the plugin's folder.

## Install

In NeoDex: **NeoStore → Discover → Presse-papiers → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).

## Paste directly (1.1.0)

**Ctrl+Alt+H**, from any app, opens a small list near the mouse, over the window you are in:

- type to search, **↑ ↓** to choose, **Enter** (or a click) **pastes directly** into the app you came from;
- **1 to 9** paste the item with that number right away;
- **Esc**, or a click elsewhere, closes the list without pasting;
- **FULL HISTORY** opens the full tab in NeoDex.

Text is always pasted **without formatting** (no font, colour or link).

**Images** you copy (a screenshot, a picture from a site) are kept too, the last 40, with a thumbnail. A click or Enter copies them again.

Passwords copied from a password manager (KeePass, Bitwarden, 1Password…) are still never saved.
