const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageMap = {
  "cmo3jwqdq0000em6w13g4uvsb": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Cardboard_box_04.JPG/640px-Cardboard_box_04.JPG",
  "cmoiyffqc0000l404uffcjefz": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/2/23/Raw_beef_steak.jpg/640px-Raw_beef_steak.jpg",
  "cmoiyh0h90000jr04gf8ztxpi": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/30/Raw_Chicken_Breasts.jpg/640px-Raw_Chicken_Breasts.jpg",
  "cmoiyheqm0000ju041m5ae774": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Macaroni.jpg/640px-Macaroni.jpg",
  "cmoiyi3fk0001jr04iy9ic9k4": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Garlic.jpg/640px-Garlic.jpg",
  "cmoiyio290001ju04tylulfnt": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/35/A%C3%A7a%C3%AD_na_Tigela_com_Banana_e_Granola.jpg/640px-A%C3%A7a%C3%AD_na_Tigela_com_Banana_e_Granola.jpg",
  "cmoiylo350001l404bgxyggav": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bacon_2.jpg/640px-Bacon_2.jpg",
  "cmoiymvrk0003ju048cffneyt": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Lingui%C3%A7a_calabresa.jpg/640px-Lingui%C3%A7a_calabresa.jpg",
  "cmoiypdng0002jr04ju643gox": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Green_olives.jpg/640px-Green_olives.jpg",
  "cmoiyqpzf0003jr04ueyms3io": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/2/21/Cream_cheese.jpg/640px-Cream_cheese.jpg",
  "cmoiyrd5i0000jr043kj19drn": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/11/Whipped_cream_bowl.jpg/640px-Whipped_cream_bowl.jpg",
  "cmoiyrtjk0001jr04qcwoxy24": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Cheddar_cheese.jpg/640px-Cheddar_cheese.jpg",
  "cmoiytg5x0004ju04q42fo9ci": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/e/ee/White_chocolate_pieces.jpg/640px-White_chocolate_pieces.jpg",
  "cmoiyu5hr0005ju04dm9xo6fd": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/0/07/Dark_chocolate_bar.jpg/640px-Dark_chocolate_bar.jpg",
  "cmoiyup210002jr04n8b8uyxc": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Dulce_de_leche.jpg/640px-Dulce_de_leche.jpg",
  "cmoiyv89v0002l404t203m05r": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Plastic_take-out_containers.jpg/640px-Plastic_take-out_containers.jpg",
  "cmoiyvyoo0006ju04t69o1kzk": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Plastic_take-out_containers.jpg/640px-Plastic_take-out_containers.jpg",
  "cmoiywdfn0003l404x9gn6xg2": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Cornmeal.jpg/640px-Cornmeal.jpg",
  "cmoiywtqr0003jr041az0w3km": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/30/Raw_Chicken_Breasts.jpg/640px-Raw_Chicken_Breasts.jpg",
  "cmoiyxrp30005jr04hw2fyvrb": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Paper_Napkins.jpg/640px-Paper_Napkins.jpg",
  "cmoiyxcel0004jr045b8osx58": "https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Goiabada_casc%C3%A3o.jpg/640px-Goiabada_casc%C3%A3o.jpg"
};

async function main() {
  for (const [id, url] of Object.entries(imageMap)) {
    await prisma.product.update({
      where: { id },
      data: { imageUrl: url }
    });
  }
}
main().finally(() => prisma.$disconnect());
