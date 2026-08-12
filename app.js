const express = require("express");
const ejs = require("ejs");
const app = express();
const _ = require("lodash");
const env = require("dotenv").config();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

const itemSchema = new mongoose.Schema({
  name: String,
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({ name: "Welcome to your todolist!" });
const item2 = new Item({ name: "Hit the + button to add a new item." });
const item3 = new Item({ name: "<-- Hit this to delete an item." });

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema],
});

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
  Item.find({})
    .then((foundItems) => {
      if (foundItems.length === 0) {
        Item.insertMany(defaultItems)
          .then(() => console.log("Successfully saved default items to DB."))
          .catch((err) => console.log(err));
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    })
    .catch((err) => console.log(err));
});

app.post("/", (req, res) => {
  const item = req.body.newItem;
  const listName = req.body.list;

  const newItem = new Item({ name: item });
  if (listName === "Today") {
    newItem.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }).then((foundList) => {
      foundList.items.push(newItem);
      foundList.save().then(() => res.redirect("/" + listName));
    });
  }
});

app.post("/delete", async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    if (listName !== "Today") {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } },
      );
      res.redirect("/" + listName);
    } else {
      await Item.findByIdAndDelete(checkedItemId);
      res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting item");
  }
});

app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({ name: customListName }).then((foundList) => {
    if (!foundList) {
      // Create a new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      list.save().then(() => res.redirect("/" + customListName));
    } else {
      // Show an existing list
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  });
});

app.get("/work", (req, res) => {
  res.render("list", { listTitle: "work", newListItems: workItems });
});

app.get("/about", (req, res) => {
  res.render("about");
});
const port = process.env.port || 3000;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
