const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

const printBill = async (billData) => {
  // 1. Initialize the printer object with configuration
  let printer = new ThermalPrinter({
    type: PrinterTypes.EPSON, // Or STAR, check your printer type
    interface: `tcp://${process.env.PRINTER_IP}:${process.env.PRINTER_PORT}`,
    // Set character set, line width, etc.
  });

  try {
    // 2. Use initialize() to establish the connection. 
    // This is the correct asynchronous method in the current library version.
    // It will throw an error if the connection fails (e.g., printer is off or IP is wrong).
    await printer.initialize(); 
    
    // Check if the printer initialization was successful (i.e., ready to print)
    if (!printer.isInitialized) {
      console.error('Printer failed to initialize/connect.');
      return false;
    }

    // Example content based on billData
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println('RESTAURANT NAME');
    printer.bold(false);
    printer.setTextSize(0, 0);
    printer.println('---');
    printer.alignLeft();

    if (billData.status === 'draft') {
      printer.bold(true);
      printer.println('*** DRAFT BILL - NOT FINAL ***');
      printer.bold(false);
    }
    
    printer.println(`Table/Customer: ${billData.customerName}`);
    printer.println(`Waiter: ${billData.waiterName}`);
    printer.println(`Date: ${new Date().toLocaleString()}`);
    printer.println('--------------------------------');
    printer.println('ITEM           QTY   PRICE   TOTAL');
    printer.println('--------------------------------');

    billData.items.forEach(item => {
      // Improved formatting to handle long item names and ensure fixed width
      const name = item.name.substring(0, 15).padEnd(15, ' ');
      const qty = String(item.quantity).padEnd(4, ' ');
      const price = String(item.price.toFixed(0)).padEnd(6, ' ');
      const total = String(item.total.toFixed(0));
      const line = `${name} ${qty} ${price} ${total}`;
      printer.println(line);
    });

    printer.println('--------------------------------');
    printer.alignRight();
    printer.bold(true);
    printer.println(`SUBTOTAL: ${billData.subtotal.toFixed(0)}`);
    printer.println(`TAX:      ${billData.tax.toFixed(0)}`);
    printer.println(`TOTAL:    ${billData.total.toFixed(0)}`);
    printer.bold(false);
    printer.alignCenter();
    printer.println('\nThank You!');
    printer.cut(); // Cut the paper

    await printer.execute();
    console.log('Bill printed successfully');
    return true;

  } catch (error) {
    // This catches errors from initialize() (connection failure) and execute() (print failure)
    console.error('Printing failed:', error);
    return false;
  }
};

module.exports = {
  printBill,
};
