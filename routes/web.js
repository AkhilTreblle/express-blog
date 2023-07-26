var express = require('express');
const bcrypt = require('bcrypt');
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/myExpress');

const session = require('express-session');

router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
const User = require('../models/user');
const Post = require('../models/post');
const Category = require('../models/category');
checkSignIn = (req, res,next) => {
  if(req.session.user){
     next();     //If session exists, proceed to page
  } else {
    res.redirect('/logout');
  }
}


//HOME PAGE
router.get('/', (req, res) => {
    User.findOne({ role: 'admin' })
      .then(adminUser => {
        if (!adminUser) {
          const newUser = new User({
            name: 'admin',
            email: 'admin@express.com',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin'
          });
  
          return newUser.save();
        }
      })
      .then(() => {
        Post.find({ status: 'approved' }).populate('user').sort({ _id: -1 })
        .then(approvedPosts => {
          res.render('home', { approvedPosts });
        })
        .catch(error => {
          console.error('Error fetching approved posts:', error);
          res.render('signup', {
            message: 'Database error',
            type: 'error'
          });
        });
      })
      .catch(error => {
        console.error('Error finding or creating admin user:', error);
        res.render('signup', {
          message: 'Database error',
          type: 'error'
        });
      });
  });

//AUTH ROUTES
router.get('/signup',(req,res)=> {
res.render('signup',{message:''});
});
  router.post('/login', (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.render('signup', { message: 'Please provide both email and password' });
    }
  
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          return res.render('signup', { message: 'User not found' });
        }
  
        const passwordMatch = bcrypt.compareSync(req.body.password, user.password);
  
        if (passwordMatch) {
          req.session.user = {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name
          };
            
          
            res.redirect('/dashboard'); 
            
          
        } else {
          res.render('signup', { message: 'Invalid Credentials' });
        }
      })
      .catch(error => {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
      });
  });
  router.post('/signup', (req, res) => {
    const { name, email, password ,confirmPassword} = req.body;
  
    if (!email || !password) {
      return res.render('signup', { message: 'Please provide both email and password' });
    }
    if (password !== confirmPassword) {
      return res.render('signup', { message: 'Passwords do not match' });
    }
  
    // Check if the user's email already exists in the database
    User.findOne({ email })
      .then((existingUser) => {
        if (existingUser) {
          return res.render('signup', { message: 'User email already exists' });
        }
  
        // If the email is unique, create a new user
        const newUser = new User({
          name,
          email,
          password: bcrypt.hashSync(password, 10),
          role: 'user',
        });
  
        // Save the new user to the database
        newUser
          .save()
          .then((user) => {
            req.session.user = user; // Store the user in the session
            res.redirect('/dashboard');
          })
          .catch((error) => {
            res.render('signup', { message: 'Error creating user: ' + error });
          });
      })
      .catch((error) => {
        res.render('signup', { message: 'Error checking user email: ' + error });
      });
  });
  
  router.get('/logout', function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.redirect('/');
  });
 

  //BLOG RELATED ROUTES
  router.get('/dashboard', checkSignIn, (req, res) => {
    const user = req.session.user;
    const message = req.session.message;
    req.session.message = null;
  
    if (user.role === 'admin') {
      User.find()
        .then(allUsers => {
          res.render('super-admin/super-admin', { user, message, allUsers }); // Pass the session user object and allUsers array to the view
        })
        .catch(error => {
          console.log(error);
          res.status(500).json({ error: 'An error occurred' });
        });
    } else if (user.role === 'manager') {
      // Manager Dashboard
  
      Category.findOne({ user: user._id })
        .then(category => {
          if (!category) {
            res.status(500).json({ error: 'An error occurred' });
            return;
          }
  
          const categoryID = category._id;
  
          // Get the total posts count from the category
          const totalPostsPromise = Post.countDocuments({ category: categoryID });
  
          // Get the pending posts
          const pendingPostsPromise = Post.find({ status: 'pending', category: categoryID }).populate('user');
  
          // Get the counts for pending, rejected, and approved posts
          const pendingPromise = Post.countDocuments({ status: 'pending', category: categoryID });
          const rejectedPromise = Post.countDocuments({ status: 'rejected', category: categoryID });
          const approvedPromise = Post.countDocuments({ status: 'approved', category: categoryID });
  
          // Wait for all the promises to be resolved
          return Promise.all([pendingPostsPromise, pendingPromise, rejectedPromise, approvedPromise, totalPostsPromise]);
        })
        .then(([pendingPosts, pendingCount, rejectedCount, approvedCount, totalPosts]) => {
          // Now you have the 'pendingPosts', 'pendingCount', 'rejectedCount', 'approvedCount', and 'totalPosts',
          // you can render the view with this data
          res.render('topic-manager/topic-manager', {
            user,
            pendingPosts,
            pendingCount,
            rejectedCount,
            approvedCount,
            totalPosts
          });
        })
        .catch(error => {
          res.status(500).json({ error: 'An error occurred' });
        });
    }else {
      Category.find()
        .then(categories => {
          res.render('user-dashboard/create-post', { user, message, categories });
        })
        .catch(error => {
          console.log(error);
          res.status(500).json({ error: 'An error occurred' });
        });
    }
  });
  
  

router.post('/blog-post', (req, res) => {

      const newPost = new Post({
        title:req.body.title,
        content: req.body.content,
        status: 'pending',
        user:req.session.user._id,
        category:req.body.category
      });
  
      newPost.save()
        .then(() => {
          req.session.message = 'success';
        
          res.redirect('/dashboard')
        })
        .catch((error) => {
          res.render('dashboard', { message: 'Error creating user: ' + error });
        });
    
  });
  router.get('/blog-posts', (req, res) => {
    const userId = req.session.user._id;
    const message = req.session.message;
    req.session.message = null;
    Post.find({ user: userId })
      .sort({ _id: -1 })
      .populate('category')
      .then(posts => {
        const user = req.session.user;
  
        Category.find()
          .then(categories => {

            res.render('user-dashboard/blog-list', { posts, user, categories ,message});
          })
          .catch(error => {
            console.error(error);
            res.status(500).json({ error: 'An error occurred while fetching categories' });
          });
      })
      .catch(error => {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching posts' });
      });
  });

//ADDING NEW CATEGORY
  router.post('/category', (req, res) => {
    const newCategory = new Category({
      name: req.body.title,
      user: req.body.user
    });

    User.findByIdAndUpdate(req.body.user, { role: 'manager' })
      .then(() => {
        return newCategory.save();
      })
      .then(() => {
        req.session.message = 'success';
        res.redirect('/dashboard');
      })
      .catch((error) => {
        res.render('super-admin/super-admin', { message: 'Error creating category: ' + error });
      });
  });

//POST APPROVAL - REJECTION
router.post('/update-status', (req, res) => {
  Post.findByIdAndUpdate(req.body.id, { status: req.body.status })
    .then(response => {
      res.json({ message: "Status updated successfully" });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
});

router.post('/update-post', (req, res) => {
  Post.findByIdAndUpdate(req.body.id, { title: req.body.title ,content: req.body.content ,category: req.body.category })
    .then(response => {
     req.session.message = 'success';
     res.redirect('/blog-posts')
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
});

//USER LIST
router.get('/users',(req,res)=>{
  const userId = req.session.user._id;

  User.find().sort({ _id: -1 })
  .then(users => {
    user = req.session.user;
    res.render('super-admin/users', { users ,user});

  }).catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
 

});


router.get('/single-blog:id',(req,res)=>{
  const userId = req.session.user._id;

  Post.find({id: req.params.id})
  .then(post => {

    res.render('user-dashboard/single-blog', { post});

  }).catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
 

})


module.exports = router;