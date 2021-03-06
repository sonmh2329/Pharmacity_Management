const User = require('../model/Authentication');
const Staff = require('../model/Staff');
const Orders = require('../model/Invoices');
const Products = require('../model/Products');
const Report = require('../model/Reports');
const ReportFiles = require('../model/ReportFiles');
const OrderDetails = require('../model/InvoicesDetails');

const fs = require('fs');
const cloudinary = require('../cloudinary');


// Find the top 10 best sold product in current month
async function findBestSold(current_month, current_year) {

    // Find list sold product in current month
    const query_month =
        current_month > 10 ? String(current_month): '0'+String(current_month);
    const query_date =
        String(current_year) + '-' + query_month + '-01';
                     
    var list_sold = await OrderDetails.aggregate([
        {
            "$match": {"createdAt": {"$gte":new Date(query_date)}}
        },
        {
            "$group": {
                _id: "$product_code",
                sumQuantity: {$sum: "$invoice_product_quantity"
            }}
        },
        // Joint result with products table to take product details
        {
            "$lookup": {
                from: "products",
                localField: "_id",
                foreignField: "product_code",
                as: "details"
            }
        },
        {
            "$replaceRoot":{
                "newRoot": {"$mergeObjects": [{ "$arrayElemAt":["$details",0]},"$$ROOT"]}
            }
        },
        {
            $sort: {"sumQuantity": -1}//descending sort
        }
    ]);

    return list_sold.slice(0,11);
}

function findRevenueAll(orders_list) {
     //Revenue for each month:
     let revenue_all_month = [0,0,0,0,0,0,0,0,0,0,0,0];
     for(let i = 0; i<12; i++) {
         revenue_all_month[i] =
              orders_list.reduce(function(total, order) {
                 if((order.invoice_date).getMonth() == i) {
                     return total + order.invoice_cost;
                 }
                 else {
                     return total + 0;
                 }
              },0)
     }
     //standardized revenue to million VND
     revenue_all_month = revenue_all_month.map(revenue => revenue/1000000);
     return revenue_all_month;
}

function findOutOfDate(product_list) {
    const Now = new Date();
    const Time1 = Now.getTime();
    
    let list_out_of_date = product_list.filter(function(product) {
         const Time2 = (product.product_expired).getTime();
         var different = Time2 - Time1;
         different = Math.ceil(different / (1000 * 3600 * 24));
         if(different <0 || different <=45) {
             return product;
         }
    });  

    return list_out_of_date;
} 


function deleteTempImg(path) {
    fs.unlink(path, function (err) {
        console.log(path);
        if (err) throw err;
        // if no error, file has been deleted successfully
        console.log('Temp File deleted!');
    });
}
class ManagerController {

    show(req, res) {
        res.redirect('/manager/dashboard');
        
    }

    dashboard(req, res,next) {
        
        var orders_list;
        //Take order form db
        Orders.find({})
            .then( orders => {
                orders_list = orders.map(order => order.toObject());

            Products.find({})
            .then(async(products) => {

                products = products.map( product => product.toObject());

                //Current month, year
                const current = new Date();
                const current_month = current.getMonth() + 1;
                const current_year = current.getFullYear();

                //Number of successed orders this month
                let month_orders =
                     orders_list.filter(order => {
                         return ((order.invoice_date).getMonth() + 1) === current_month;
                    });

                // Revenue this month
                let revenue = month_orders.reduce(function(total, order) {
                    return total + order.invoice_cost;
                }, 0);

                //Number of product import this month
                let products_this_month =
                        products.filter( product => {
                            return (product.createdAt !== undefined)&&(product.createdAt).getMonth() === (current_month - 1);
                        });

                const revenue_all_month = findRevenueAll(orders_list);
                const top_best_sold = await findBestSold(current_month,current_year);
                const list_out_of_date = findOutOfDate(products);
         
                res.render('dashboard', {
                    list_out_of_date,
                    top_best_sold,
                    revenue_all_month,
                    products_this_month,
                    revenue,
                    month_orders,
                    orders_list,
                    products,
                    layout:'main'
                })
            })
            .catch(next);


            });
        
    }

    showStaff(req,res,next) {
        
        Staff.find({})
            .then(staffs => {
                staffs = staffs.map( staff => staff.toObject());
                res.render('staff_management', {
                    staffs,
                    layout: 'main'
                })
            })
            .catch(next)
    }

    async saveStaffInfo(req,res,next) {
        
        const formData = req.body;

        const result_cloud = await cloudinary.v2.uploader.upload(req.file.path,
            {folder: "staffs"});
            
            formData.staff_img = result_cloud.secure_url;
            formData.staff_img_id = result_cloud.public_id;
            const newStaff = new Staff(formData);

            // Delete temp file save by multer
            deleteTempImg(req.file.path);
        // Save staff info
        newStaff.save()
            .then(() => {
                //Refresh page:  back to the page the request came from.
                res.redirect(req.get('referer'));
            })
            .catch(next);
    }

    showEditPage(req, res, next) {
        
        // Find staff and show edit staff info page
        Staff.findOne({staff_code: req.params.id})
            .then(staff => {
                if(staff) {
                    staff = staff.toObject();
                    res.render('staff_edit', {
                        staff,
                        layout: 'main'
                    })
                }
                else {
                    next();
                }
            })
            .catch(next)
    }

    async updateStaffInfo(req, res, next) {
        const formData = req.body;

        if(req.file) {
        //if update image, delete the old one
            Staff.findOne({staff_code: req.params.id})
                .then(staff => {
                    if(staff.staff_img&&staff.staff_img_id) {

                        cloudinary.v2.uploader.destroy(staff.staff_img_id,
                            function(result) {
                            });
                        
                    }
                })
                .catch(next)
            //UPdate with the new one
            const new_img = await cloudinary.v2.uploader.upload(req.file.path, {folder: "staffs"});
            formData.staff_img = new_img.secure_url;
            formData.staff_img_id = new_img.public_id;
            // Delete temp file
            deleteTempImg(req.file.path);
        }

        // Update staff info
        Staff.updateOne({staff_code: req.params.id}, formData)
            .then(()=> {
                res.redirect('/manager/staff-management');
            })
            .catch( error => {
                res.redirect(req.get('referer'));
            });
    }

    deleteStaffInfo(req, res, next) {
        Staff.deleteOne({staff_code: req.params.id})
            .then(() => {
                res.redirect('/manager/staff-management');
            })
            .catch(next);
    }

    show_report_page(req, res, next) {

        Report.find({})
            .then( reports => {

                reports = reports.map( report => report.toObject());

                res.render('report_list_manager',
                {
                    layout:"main",
                    reports
                });
            })
    }

    show_report_detail(req, res, next) {
        Report.findOne({report_link: req.params.report_link})
            .then(report => {
                
                report = report.toObject();
                Staff.findOne({staff_code: report.staff_code })
                    .then( async (staff) => {
                        staff = staff.toObject();
                        let report_files =
                            await ReportFiles.find({report_link: report.report_link});
                        report_files =
                            report_files.map(file => file.toObject());

                        res.render('report_detail', {
                            layout:'main',
                            report,
                            staff,
                            report_files
                        });
                    })
                
            })
            .catch(next)
    }
}

module.exports = new ManagerController;
