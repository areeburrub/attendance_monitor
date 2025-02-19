const puppeteer = require('puppeteer');
const express = require('express')
//const {PuppeteerScreenRecorder} = require('puppeteer-screen-recorder');
const port = process.env.PORT || 9696
const app = express()

app.get('/attendance', async (req, res) => {

    const ad_number = req.query.adno
    const pswd = req.query.pswd || "GCET123"
    if (!ad_number) {
        res.status(400).send({error: "Admission number is not found!"})
    }

    else {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto("https://gu.icloudems.com")

        await page.waitForSelector("#useriid")
        await page.focus('#useriid')
        await page.keyboard.type(ad_number)


        await page.waitForSelector("#actlpass")
        await page.focus('#actlpass')
        await page.keyboard.type(pswd)

        await page.waitForTimeout(100);

        await (await page.$('#psslogin')).press('Enter'); // Enter Key

        await page.waitForTimeout(200);

        if (page.url().includes("errormessage=Invalid+Username+or+Password.Please+try+again."))
            res.status(400).send("Invalid Login Credentials")
        else {
            await page.goto('https://gu.icloudems.com/corecampus/student/attendance/subwise_attendace_new.php')
            //
            await page.waitForTimeout(1000);

            //await page.click("#select2-acadyear-container")
            //await (await page.$('.select2-selection__rendered')).press('Enter'); // Enter Key
            //await (await page.$('#select2-acadyear-result-npqk-2021-2022')).press('Enter'); // Enter Key

            await page.select('#acadyear', '2021-2022')
            await page.waitForTimeout(2000)

            const values = await page.evaluate(() => {
               const select = document.querySelector('#classid');
               return Array.from(select.options).map(o => o.value);
            });
            await page.waitForTimeout(1000);
            await page.select("#classid", await values[values.length-1]);
            
            await page.waitForTimeout(1000)
            await (await page.$('#getattendance')).press('Enter'); // Enter Key


            await page.waitForTimeout(500)


            const result = await page.$$eval('.table tr', rows => {
                return Array.from(rows, row => {
                    const columns = row.querySelectorAll('td');
                    return Array.from(columns, column => column.textContent);
                });
            });

            let final = [];

            let final_percentage = {
                'total_classes': '',
                'percentage': '',
            }

            //get photo and name as well

            //const img = await page.$$eval('.rounded-circle.rounded.img-rounded.image-cropper > img[src]', imgs => imgs.map(img => img.getAttribute('src')));

            const images = await page.$$eval('img', anchors => [].map.call(anchors, img => img.src));

            const dp = images[images.findIndex(element => element.includes("/student_profile"))]

            const name = await page.evaluate(() => {
                const elements = document.getElementsByClassName('d-none d-lg-inline-block mr-2');
                return Array.from(elements).map(element => element.innerText);
            })

            for (let i = 0; i < result.length; i++) {
                let data = {
                    'serial_number': '',
                    'name': '',
                    'subject_code': '',
                    'code': '',
                    'classes': '',
                    'percentage': ''
                }
                for (let j = 0; j < result[i].length; j++) {
                    if (i === (result.length - 1)) {
                        if (j !== 0)
                            final_percentage[Object.keys(final_percentage)[j - 1]] = result[i][j];
                    } else
                        data[Object.keys(data)[j]] = result[i][j];
                }
                if (!isEmpty(final_percentage)) {
                    final.push(final_percentage)
                }
                if (!isEmpty(data)) {
                    final.push(data)
                }

            }

            let metadata = {name, dp}
            final.push({metadata})

            res.send(final)
            await browser.close();
        }
        await browser.close()
    }
})

function isEmpty(obj) {
    for (let key in obj) {
        if (obj[key] !== null && obj[key] !== "")
            return false;
    }
    return true;
}

app.listen(port, () => {
    console.log(`Listening @ ${port}!`)
})
