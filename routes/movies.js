const express = require('express')
const router = express.Router()
const Movie = require('../models/movie')
const Director = require('../models/director')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

// All movies Route
router.get('/', async (req, res) => {
    let query = Movie.find()
    if (req.query.title != null && req.query.title !== '') {
        query = query.regex('title', new RegExp(req.query.title, 'i'))
    }
    if (req.query.publishedBefore != null && req.query.publishedBefore !== '') {
        query = query.lte('publishDate', req.query.publishedBefore)
    }
    if (req.query.publishedAfter != null && req.query.publishedAfter !== '') {
        query = query.gte('publishDate', req.query.publishedAfter)
    }
    try {
        const movies = await query.exec()
        res.render('movies/index', {
            movies: movies,
            searchOptions: req.query
        })
    } catch {
        res.redirect('/')
    }
})

// New movies Route
router.get('/new', async (req, res) => {
    await renderNewPage(res, new Movie())
})

// Create movies Route
router.post('/', async (req, res) => {
    const movie = new Movie({
        title: req.body.title,
        director: req.body.director,
        publishDate: new Date(req.body.publishDate),
        movieLink: req.body.movieLink,
        description: req.body.description
    })
    saveCover(movie, req.body.cover)

    try {
        const newMovie = await movie.save()
        res.redirect(`movies/${newMovie.id}`)
    } catch {
        await renderNewPage(res, movie, true)
    }
})

// Show movie Route
router.get('/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
            .populate('director')
            .exec()
        res.render('movies/show', { movie: movie })
    } catch {
        res.redirect('/')
    }
})

// Edit movie Route
router.get('/:id/edit', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
        await renderEditPage(res, movie)
    } catch {
        res.redirect('/')
    }
})

// Update Book Route
router.put('/:id', async (req, res) => {
    let movie

    try {
        movie = await Movie.findById(req.params.id)
        movie.title = req.body.title
        movie.director = req.body.director
        movie.publishDate = new Date(req.body.publishDate)
        movie.movieLink = req.body.movieLink
        movie.description = req.body.description
        if (req.body.cover != null && req.body.cover !== '') {
            saveCover(movie, req.body.cover)
        }
        await movie.save()
        res.redirect(`/movies/${movie.id}`)
    } catch {
        if (movie != null) {
            await renderEditPage(res, movie, true)
        } else {
            redirect('/')
        }
    }
})

// Delete movie Page
router.delete('/:id', async (req, res) => {
    let movie
    try {
        movie = await Movie.findById(req.params.id)
        await movie.remove()
        res.redirect('/movies')
    } catch {
        if (movie != null) {
            res.render('movies/show', {
                movies: movies,
                errorMessage: 'Could not remove movie'
            })
        } else {
            res.redirect('/')
        }
    }
})

async function renderNewPage(res, movie, hasError = false) {
    await renderFormPage(res, movie, 'new', hasError)
}

async function renderEditPage(res, movie, hasError = false) {
    await renderFormPage(res, movie, 'edit', hasError)
}

async function renderFormPage(res, movie, form, hasError = false) {
    try {
        const directors = await Director.find({})
        const params = {
            directors: directors,
            movie: movie
        }
        if (hasError) {
            if (form === 'edit') {
                params.errorMessage = 'Error Updating Movie'
            } else {
                params.errorMessage = 'Error Creating Movie'
            }
        }
        res.render(`movies/${form}`, params)
    } catch {
        res.redirect('/movies')
    }
}

function saveCover(movie, coverEncoded) {
    if (coverEncoded == null) return
    const cover = JSON.parse(coverEncoded)
    if (cover != null && imageMimeTypes.includes(cover.type)) {
        movie.coverImage = new Buffer.from(cover.data, 'base64')
        movie.coverImageType = cover.type
    }
}

module.exports = router
