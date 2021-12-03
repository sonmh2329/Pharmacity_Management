
const User = require('../model/Authentication');
const Products = require('../model/Products');

class StaffController {

    

    show(req, res, next) {

        User.findOne({_id: req.cookies.userId})
            .then((auth)=> {
                if(auth.role != 'Staff') {
                    res.redirect('/manager');
                    return;
                }
                
                Products.find({})
                    .then( (products) => {
                        products = products.map( product => product.toObject());
                            //change date and time 
                            res.locals.page_number = 1;
                            res.render('product_manage', {
                                products,
                                layout: 'staff_layout'
                            });
                            
                    })
                    .catch(next);


            })
            .catch(next);
        
    }

    show_product(req, res, next) {
        Products.find({})
            .then( (products) => {
                products = products.map( product => product.toObject());
                var page_index = [];
                for(var i = 1; i<= Math.ceil((products.length)/20); i++) {
                    page_index.push(i);
                }
                let page_number = (req.query.page) ||1;
                const product_perpage = 20;

                products = products.slice((page_number-1)*product_perpage, (page_number-1)*product_perpage + product_perpage );
                
                
                res.locals.page_number = page_number;
                res.render('product_manage', {
                    products,
                    page_index,
                    layout: 'staff_layout'
                });
            })
            .catch(next);
    }


    add_product(req, res, next) {
        res.render('create_product', {layout: 'staff_layout'});
    }

    store_product(req, res, next) {
        const formData = req.body;
        const newProduct = new Products(formData);
        newProduct.save()
            .then(()=> {
                res.redirect('/staff/product');
            })
            .catch((error)=> {
                const oldData = formData;
                res.render('create_product',
                {
                    layout:'staff_layout',
                    errors: ['Mã sản phẩm đã tồn tại !'],
                    oldData
                })
            });
    }
}

module.exports = new StaffController;
