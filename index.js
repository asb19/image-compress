const express = require('express')

const app = express()

app.use(express.static(__dirname + '/public'));

app.get('/', (req,res)=> {
    res.render('index.html')
})



app.listen(5500, ()=>{
    console.debug("listening at port", 5500)
})