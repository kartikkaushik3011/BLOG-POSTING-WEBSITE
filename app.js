const express = require('express')
const app = express();
const userModel = require("./modules/user")
const cookieParser = require('cookie-parser');
const path = require('path')
const bcrypt = require('bcrypt')
const postModel = require('./modules/post')
const jwt = require('jsonwebtoken');
const upload = require('./configs/multerconfig');



app.set("view engine", "ejs")
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


app.get("/", (req, res) => {
    res.render('index')
})

app.post("/register", async (req, res) => {
    let { username, name, email, age, password } = req.body;
    let user = await userModel.findOne({ email: email });
    if (user) res.status(500).send("user already exists")

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
            let user = userModel.create({
                name,
                email,
                username,
                password: hash,
                age
            })
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh")
            res.cookie("token", token)
            res.redirect('/login')
        })
    })
})
app.get("/login", (req, res) => {
    res.render("login")
})
app.post("/login", async (req, res) => {
    let { password, email } = req.body;
    const user = await userModel.findOne({ email: email });
    if (!user) res.status(500).send("something went wrong");

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh")
            res.cookie("token", token)
            res.status(200).redirect("/profile");
        } else {
            res.redirect('/login');
        }
    });
})
app.get("/logout", (req, res) => {
    res.cookie("token", "")
    res.redirect("/login")
})
app.get("/profile", isLoggedIn, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email }).populate("posts")
    res.render("profile", { user })
})
app.get("/like/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid)
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid))
    }
    await post.save();
    res.redirect("/profile")
})
app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    res.render("edit", { post })
})
app.get("/delete/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({ _id: req.params.id })
    res.redirect("/profile")
})
app.post("/update/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content })
    res.redirect("/profile")
})
app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let post = await postModel.create({
        user: user._id,
        content: req.body.content
    })
    user.posts.push(post._id);
    await user.save()
    res.redirect("/profile")
})
app.get("/profile/upload", (req, res) => {
    res.render('profileupload');
})
app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email })
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile")
})
// app.get("/test",(req,res)=>{
//     res.render("test")
// })
// app.post("/upload",upload.single("image"),(req,res)=>{
//     console.log(req.file);
// })

function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") res.send("You need to login first")

    else {
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
        next();
    }
}


app.listen(process.env.PORT || 5000)