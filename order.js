
window.embrew.catalog={};

function indexCatalog(data) {
    const cat=window.embrew.catalog;
    cat.byId=[];
    data.forEach((obj) => {
        cat.byId[obj.id]=obj;
    })
}

async function loadCatalog() {
    const resp=await fetch("https://thinktanked.org/catalog.json?v=2");
    const data=await resp.json();
    indexCatalog(data);
    return (data);
}


function addToCart(itemId) {
    const cat=window.embrew.catalog;
    const cart=window.embrew.cart;
    const item=cat.byId[itemId];
    const variationId=item.item_data.variations[0];
    cart.add(variationId);

}

window.embrew.cart={
    line_items: [],
    remove: (fp) => {
        var index=cart.line_items.findIndex((li) => fp == li.fp);
        cart.line_items.splice(index, 1);
        cart.store();
    },
    add: (variation, mods) => {
        const catalog=window.embrew.catalog;
        if (!mods) mods=[];
        var li=cart.find(variation, mods);
        if (li) {
            li.quantity++;
        } else {
            var fp=variation;
            var price=catalog.byId[variation].item_variation_data.price_money.amount;
            mods.forEach((m) => { fp+="-"+m; price+=catalog.byId[m].modifier_data.price_money.amount});
            cart.line_items.push({fp: fp, variation: variation, mods: mods, quantity: 1, price:  price})
        }
        cart.store();

    },
    find: (variation, mods) => {
        var fp=variation;
        mods.forEach((m) => { fp+="-"+m});
        return cart.line_items.find((li) => fp == li.fp)
    },
    setQuantity: (fp, q) => {
        var index=cart.line_items.findIndex((li) => fp == li.fp);
        cart.line_items[index].quantity=q;
        cart.store();

    },
    totalAmount: () => {
        var total=0;
        cart.line_items.forEach((li)=>{ total+=li.price*li.quantity
        })
        return (total);
    },
    totalItems: () => {
        var total=0;
        cart.line_items.forEach((li)=>{ total+=li.quantity
        })
        return (total);
    },
    clear: () => {
        cart.line_items=[];
        cart.store();
    },

    store: () => {
        localStorage.setItem("cart",JSON.stringify({lastUpdate: new Date(), line_items: cart.line_items}));
    },

    load: () => {
        var cartobj=JSON.parse(localStorage.getItem("cart"));
        cart.line_items=[];

        if (cartobj && cartobj.line_items) {
            // validate
            cartobj.line_items.forEach((li) => {
                if (catalog.byId[li.variation]) {
                    var push=true;
                    li.mods.forEach((m) => {
                        if (!catalog.byId[m]) push=false;
                    });
                    if (push) cart.line_items.push(li);
                }
            })
        }
    },

    init: () => {
        await loadCatalog();
    }
}

cart.init();