# Characters

`attributes`
an array of custom attributes

# Plotlines

`templateData`
same structure as a plottr file, but is a subset. Will be combined with an empty file like so:

```js
Object.assign({}, emptyFile, templateData);
```

Will also be used to add individual plot lines to a story (or more, see below)

- If there's scenes, they will be added as a plot line
- If there's only one line, all cards will be added on the next plot line
- If there's more than one line, cards will be added to their respective line
