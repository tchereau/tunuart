import { Tun } from 'tuntap2'
import { SerialPort } from 'serialport'
import { config } from 'dotenv'

config()

let serial = null
let tun = null
let debitRX = 0
let debitTX = 0

let setupSerial = async () => {
    try {
        serial = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: Number(process.env.BAUD_RATE) })
        console.log('Serial port opened')
    } catch (error) {
        console.error('Error while setting up serial port')
        console.log(error)
        process.exit(1)
    }
}

let setupTun = async () => {
    try {
        tun = new Tun('tun0')
        tun.ipv4 = process.env.TUN_IP
        tun.isUp = true
        console.log('Tun interface created')
    } catch (error) {
        console.error('Error while setting up tun interface')
        console.log(error)
        process.exit(1)
    }
}

let transmit = async () => {
    serial.on('data', (data) => {
        try {
            tun.write(data)
            debitRX += data.length
        } catch (error) {
            console.error('Error while writing to tun interface')
            console.log(error)
        }
    })
    // if data is received from the tun interface and if no data received from the serial port, write it to the serial port
    if (serial.read() === null) {
        tun.on('data', (data) => {
            try {
                serial.write(data)
                debitTX += data.length
            } catch (error) {
                console.error('Error while writing to serial port')
                console.log(error)
            }

        })
    }
}

let showDebit = async () => {
    console.log('Showing debit')
    setInterval(() => {
        let rx = ''
        let tx = ''
        // B/s or KB/s or MB/s
        if (debitRX > 1000000) {
            rx = `${(debitRX / (1000 * 1000)).toFixed(2)} Mb/s`
        }
        if (debitRX > 1000) {
            rx = `${(debitRX / 1024).toFixed(2)} Kb/s`
        } else {
            rx = `${debitRX} b/s`
        }

        if (debitTX > 1000 * 1000) {
            tx = `${(debitTX / (1000 * 1000)).toFixed(2)} Mb/s`
        }
        if (debitTX > 1000) {
            tx = `${(debitTX / 1000).toFixed(2)} Kb/s`
        } else {
            tx = `${debitTX} b/s`
        }
        console.log(`Debit RX: ${rx}, Debit TX: ${tx}`)
        debitRX = 0
        debitTX = 0
    }, 1000)
}

let main = async () => {
    await setupTun()
    await setupSerial()
    await transmit()
    
    console.log('Setup done')
    await showDebit()
}

main()