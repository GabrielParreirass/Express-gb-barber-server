const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')('sk_test_51LEKnaJ4lufim0SgI5e76tPEkitvmhY1CmwInaMGCARUJyJDTOlxFL8wfB2bwc4vkKFYwp1z4Wp8VXpyVLXM4PQC00GNnIaD2b')
require('dotenv').config()
let db = mongoose.connection
const saltRound = 10
const token_secret = 'asidujady01q31w3313'
let tokenGeral = ''
let barberSatus = ''



const LinkSchema = new mongoose.Schema({
    email: String,
    password: String,
    barber: Boolean,
    username: String
})


const ProductsSchema = new mongoose.Schema({
    name: String,
    value: Number,
    storage: Number,
    description: String

})

const Products = mongoose.model('Products', ProductsSchema)

const User = mongoose.model('User', LinkSchema)


mongoose.connect('mongodb+srv://gepeto:Alimento@cluster0.kg0uz.mongodb.net/users?retryWrites=true&w=majority')


db.on('error', () => { console.log('Houve um erro') })
db.once('open', () => { console.log('DataBase loaded') })

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.json())
app.use(cors())



app.post('/register', async (req, res) => {
    const email = req.body.email
    const password = req.body.password


    const selectedUser = await User.findOne({ email: req.body.email })
    if (selectedUser) {
        return res.send('Email já cadastrado')
    } else {
        bcrypt.hash(password, saltRound, async (err, hash) => {
            const user = new User({
                email: req.body.email,
                username: req.body.username,
                baber: false,
                password: hash
            })
            try {
                const savedUser = await user.save()
                res.send('Cadastro efetuado com sucesso!')
            } catch (error) {
                res.status(400).send(error)
            }
        })
    }
})

app.post('/', async (req, res) => {
    const email = req.body.email
    const password = req.body.password


    const selectedUser = await User.findOne({ email: req.body.email })

    if (selectedUser) {
        bcrypt.compare(password, selectedUser.password, (error, result) => {
            if (result === true) {
                if (selectedUser.email.includes('@barber')) {
                    const token = jwt.sign({ _id: selectedUser._id }, token_secret)
                    tokenGeral = token
                    barberSatus = true
                    res.json({ auth: true, token: token, result: selectedUser })
                } else {
                    const token = jwt.sign({ _id: selectedUser._id }, token_secret, { expiresIn: '300s' })
                    tokenGeral = token
                    barberSatus = false
                    res.json({ auth: true, token: token, result: selectedUser })
                }
            } else {
                res.status(400).send('Senha n bate')
            }
        })
    } else {
        res.status(400).send('Nenhum usuario encotrado com esse email!')

    }
})


app.get('/', async (req, res) => {
    try {
        const decoded = jwt.verify(tokenGeral, token_secret)
        const selectedUser = await User.findOne({ _id: decoded._id })
        if (decoded && barberSatus == true) {
            res.json({ is: 'barber', username: selectedUser.username })
        } else if (decoded && barberSatus == false) {
            res.json({ is: 'user', username: selectedUser.username })
        }
    } catch (error) {
        res.send(error.message)
    }

})

app.get('/home', async (req, res) => {

    const selectedUser = await User.find({ barber: true })


    res.json(selectedUser)
})

app.get('/testeapi', (req, res)=>{
    
    res.send('api ok meu cria')
})


app.post('/profiles', async (req, res) => {
    const id = req.body.id
    try {
        if (id.length == 24) {
            const selectedUser = await User.findOne({ _id: id })
            res.send(selectedUser)
            if (!selectedUser) {
                res.send('error')
            }
        } else {
            res.send(
                'error'
            )
        }
    } catch (error) {
        res.send('error')
    }


})


app.get('/store', async (req, res) => {
    const selectedUser = await Products.find({ product: true })

    res.send(selectedUser)

})


app.post('/store/checkout', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.items.map(item => {
                return {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: item.name
                        },
                        unit_amount: item.value * 100
                    },
                    quantity: item.qty
                }
            }),
            success_url: `http://localhost:3000/store`,
            cancel_url: `http://localhost:3000/store`,
        })
        res.send(session.url)
    } catch (e) {
        res.send(e)
    }
})


app.listen(process.env.PORT || 3001, () => {
    console.log('server rodando na porta 3001')
})
