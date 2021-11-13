
const User = require('../model/Authentication');
const Products = require('../model/Products');
const Invoices = require('../model/Invoices');

class OrderController {


    show(req, res, next) {
        Products.find({})
            .then(products => {
                var str = 'OK';
                var products_code_list = products.map( product => {
                    product = product.toObject();
                    return product.product_code
                });
                var products_name_list = products.map( product => {
                    product = product.toObject();
                    return product.product_name;
                });
                var products_price_list = products.map( product => {
                    product = product.toObject();
                    return product.product_price_out;
                });
                
                res.render('order',{
                    product_code_list: JSON.stringify(products_code_list),
                    product_name_list: JSON.stringify(products_name_list),
                    product_price_list: JSON.stringify(products_price_list),
                    str,
                    layout:'staff_layout'
                })
            })
            .catch(next);
    }

    saveInvoice(req, res, next) {

        //Pre processing data
        const formData = req.body;
        
        // Take product_id and quantity from req.body
        // And change to list_products to save
        var list_products = [];
        var list_products_code;
        var list_products_quantity;
        if(!Array.isArray(formData.product_code)) {
            list_products_code = [formData.product_code];
            list_products_quantity = [formData.product_quantity]
        }
        else {
            list_products_code = formData.product_code;
            list_products_quantity = formData.product_quantity;
        }

        for(var i = 0; i<list_products_code.length; i++) {
            var temp_product = {};
            temp_product.product_code = list_products_code[i];
            temp_product.product_quantity = list_products_quantity[i];
            list_products.push(temp_product);
        }

        // Delete old invoice field
        delete formData.product_code;
        delete formData.product_quantity;
        // Create new  invoice field
        formData.list_products = list_products;
        formData.invoice_status = 'Đã xử lý';

        // Save data
        const newData = new Invoices(formData);
        newData.save()
            .then(() => {
                res.redirect('/order');
            })
            .catch((error) => {
                res.send(error);
            })
    }


}

module.exports = new OrderController;