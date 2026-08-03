import { getValidationWarnings } from "./packages/bibtex/src/bibtex-formatter.js";

const parsed = {
    entryType: "article",
    key: "test",
    fields: {
        author: "Smith",
        title: "Title",
        year: "2024",
        booktitle: "Book"
    }
};

console.log(getValidationWarnings(parsed));
