# Presse-papiers (Clipboard)

The history of everything you copy in Windows, kept in NeoDex: search it, pin what you reuse often and copy any item again in one click. **Ctrl+Alt+H** opens it from anywhere.

*Version française : [README.md](README.md)*

## How it works

The plugin reads the Windows clipboard every second, even when NeoDex is in the background. Each new text copied, in any application, is added to the top of the history with the time of the copy ("just now", "5 min ago"…).

- Copying a text that is already there moves it back to the top instead of creating a duplicate.
- What was already copied when NeoDex started does not count.
- Only text is kept (up to 20,000 characters per item), not images or files.

## Using the history

- **Click** an item: it is copied back to the clipboard, ready to paste.
- **Pin**: the item moves to the **Pinned** section at the top and is never removed on its own. **Unpin** puts it back in **Recent**.
- **Search**: filters the history as you type.
- **Pause**: nothing you copy is recorded while the pause is on.
- **Clear all**: empties the history, except pinned items (after confirmation).

## Privacy

- The last 200 items are kept; beyond that, the oldest unpinned ones go.
- Anything a password manager marks as "do not keep" (the standard Windows signal for copied passwords) is never recorded.
- Everything stays on your computer.

## Permission

The plugin needs the **system pane** permission to read the clipboard in the background; without it, it says so and shows where to grant it (Permissions).

## Data and sync

Nothing is synced: the history belongs to each PC and stays in the plugin's folder.

## Install

In NeoDex: **NeoStore → Discover → Presse-papiers → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
