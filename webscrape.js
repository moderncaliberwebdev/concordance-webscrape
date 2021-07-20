const puppeteer = require('puppeteer')
const biblewords = require('./biblewords.json')
const fs = require('fs')

;(async () => {
  const concordance = []

  const browser = await puppeteer.launch({ devtools: true }) //Chromium Bug Testing >>> { devtools: true }
  const page = await browser.newPage()
  for (let i = 6507; i < 6508; i++) {
    console.log(i)
    const word = biblewords[i].kjv_word
    const url = `http://thekingsbible.com/Concordance/${word}`
    await page.goto(url)
    await page.waitForTimeout(100)

    let pageNumber = await page.evaluate(() => {
      if (document.querySelector('.pagination')) {
        return document.querySelector('.pagination').children.length - 2
      } else return 1
    })

    for (let i = 0; i < pageNumber + 1; i++) {
      const data = await scrapeKJV(page, word)

      concordance.push(data)
      const fullConcordance = JSON.stringify(concordance)
      fs.writeFileSync('concordance10.js', fullConcordance, { flags: 'a' })

      if (i != pageNumber && pageNumber != 1) {
        const nextButton = await page.$("li[id='next-page'] > a")
        await nextButton.click()
        await page.waitForTimeout(1000)
        await page.evaluate( () => {
                window.scrollBy(0, window.innerHeight);
            });
        await page.waitForSelector('#next-page');
      }
    }
  }

  await browser.close()
})()

const scrapeKJV = async (page, word) => {
  return page.evaluate((word) => {
    let listItems = document.getElementsByClassName('concordanceitem')
    let listLength = listItems.length
    if (listLength == 400) {
      listLength = 200
    }
    const listArray = []
    for (let i = 0; i < listLength; i++) {
      const reference = listItems[i].innerText

      let strongsnumber = ''
      if (listItems[i + 1]) {
        strongsnumber = listItems[i + 1].innerText
        if (strongsnumber.includes(':')) {
          strongsnumber = ''
        }
      }

      if (
        listArray[0] &&
        listArray[0]['kjv_word']['word'] == word &&
        listArray[0]['kjv_word']['reference'] == reference
      ) {
        return listArray
      } else {
        listArray.push({
          kjv_word: {
            word,
            reference,
            strongsnumber,
          },
        })
      }

      if (
        listItems[i + 1] &&
        listItems[i + 1].innerText.includes(':') == false
      ) {
        i++
      }
    }

    return listArray
  }, word)
}
