# Pets

A little pixel cat that naps on the header of the window you're working in.
It lies along the top edge, in the middle, with its front paws over the
header, and follows the focus from window to window. It pans and zooms with
the canvas, swishes its tail now and then, blinks, and a click on it gets a
heart.

## Settings

- **Coat:** ginger, grey, black or cream.
- **Size:** small, medium or large next to the window. It still grows and
  shrinks with the zoom, and hides on a window narrower than itself.

Hide it on the Pets page in Plugins (the overlay's switch), or turn the
plugin off.

## How it works

One overlay (`contributes.overlays`) over the canvas, with the `canvas`
permission: it listens for `view` and `active` (the focused window and its
frame), places the cat at `toScreen` of the header's top middle, and draws
it on a `<canvas>` in whole device pixels so it stays crisp. Only the cat
above the edge is a hit area: the paws leave the header's dragging alone.

The cat is drawn from letters, one per pixel, in `src/client/cat.ts`.
