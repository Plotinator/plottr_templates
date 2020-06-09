# Characters

`attributes`
an array of custom attributes

- name
- type (`paragraph` or `text`)

# Plotlines

`templateData`
same structure as a pltr file, but is a subset. Will be combined with an empty file like so:

```js
Object.assign({}, emptyFile, templateData);
```

Will also be used to add individual plot lines (or more, see below) to a book

- If there's chapters, they will be added as cards on a line
- If there's only one line, all cards will be added to a new line
- If there's more than one line, cards will be added to their respective line

