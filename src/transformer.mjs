// The code reading data from a JS file, runs as a separate process to be able to run it synchronously

let file = process.argv[2]
let fileUrl = `file://${file}`

try {
  let { default: data } = await import(fileUrl)
  process.stdout.write(JSON.stringify(data))
} catch (error) {
  console.error('Could not import file')
  console.error(error)
  process.exit(1)
}
