const questions = [ 
    "O que eu aprendi hoje?",
    "O que me deixou aborrecido? E que eu poderia fazer para melhorar?",
    "O que me deixou feliz hoje?",
    "Quantas pessoas eu ajudei hoje?"
]

const ask = (index = 0) => {
    process.stdout.write("\n\n" + questions[index] + " > ")
}

ask()

const answers = []

process.stdin.on('data', (data) => {
    answers.push(data.toString().trim())
    if (answers.length < questions.length) {
        ask(answers.length)
    } else { 
             process.exit()
    }
})

process.on('exit', () => {
    console.log(`
    
        Bacana Raphael Busquet!

        O que aprendeu hoje?
        
        ---${answers[0]}
        
        O que te deixou aborrecido?

        ---${answers[1]}

        O que te deixou feliz hoje?

        ---${answers[2]}

        Quantas pessoas você ajudei hoje?

        ---Você ajudou ${answers[3]} pessoas.

        Volte amanhã para novas reflexões!

  `)
})