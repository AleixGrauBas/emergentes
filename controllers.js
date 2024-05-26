const { graphql, buildSchema } = require('graphql');
const Realm = require('realm');
const model = require('./model'); // Database

let DB;

model.getDB().then(db => {
    DB = db;
});

// Notifications
const sse = require('./utils/notifications');
sse.start();

const schema = buildSchema(`
  type Query {
    hello: String
    users: [User]
    blogs: [Blog]
    searchBlog(q:String!):[Blog]
    posts(blogId:ID!):[Post]
    searchPost(blogId:ID!, q:String!):[Post]
    getInterests:[Interest]
    usersForInterest(interestId: ID!): [User] # Cambiado de interestName a interestId
  }
  type Mutation {
    addUser(name: String!, passwd: String!, email: String!, interestIds: [ID]): User! # Cambiado de interestNames a interestIds
    addBlog(title: String!, creator: ID!): Blog!
    addPost(title: String!, content: String!, authorId: ID!, blogId: ID!): Post!
    addInterest(name: String!): Interest!
    addInterestsToUser(userName: String!, interestNames: [String]!): User!
  }  
  type User {
    _id: ID # Añadido el campo _id
    name: String
    passwd: String
    email: String
    interests: [Interest]
    # Agrega aquí todos los campos adicionales que tenga el objeto User
  }
  type Post {
    title: String
    content: String
    _id: ID
    author: User
    blog: Blog
  }
  type Blog {
    creator: User
    title: String
    _id: ID
  }
  type Interest {
    _id: ID # Añadido el campo _id
    name: String
  }
`);

const rootValue = {
    usersForInterest: ({ interestId }) => {
        // Convertir el ID del interés a un objeto ObjectId
        interestId = Realm.BSON.ObjectId(interestId);
    
        // Buscar el interés en la base de datos por su ID
        const interest = DB.objectForPrimaryKey('Interest', interestId);
        
        // Crear una lista para almacenar los usuarios que tienen el interés específico
        const usersWithInterest = [];
    
        // Obtener todos los usuarios de la base de datos
        const allUsers = DB.objects('User');
    
        // Iterar sobre cada usuario para verificar si tienen el interés
        allUsers.forEach(user => {
            // Verificar si el usuario tiene el interés específico
            const hasInterest = user.interests.some(userInterest => userInterest._id.equals(interestId));
            
            // Si el usuario tiene el interés, agregarlo a la lista de usuarios con el interés específico
            if (hasInterest) {
                usersWithInterest.push(user);
            }
        });
    
        // Devolver la lista de usuarios con el interés especificado
        return usersWithInterest;
    },
    

    hello: () => "Hello World!",

    users: () => DB.objects('User'),

    blogs: () => DB.objects('Blog'),

    searchBlog: ({ q }) => {
        q = q.toLowerCase();
        return DB.objects('Blog').filter(x => x.title.toLowerCase().includes(q));
    },

    posts: ({ blogId }) => {
        return DB.objects('Post').filter(x => x.blog.title == blogId);
    },

    getInterests: () => {
        return DB.objects('Interest');
    },

    addInterestsToUser: ({ userName, interestNames }) => {
        let user = null;
      
        // Obtener el usuario existente por su nombre
        const existingUser = DB.objects('User').filtered('name == $0', userName)[0];
        
        if (existingUser) { // Si el usuario existe, agregar intereses
            DB.write(() => {
                // Iterar sobre los nombres de interés proporcionados
                interestNames.forEach(interestName => {
                    // Buscar si el interés ya existe en la base de datos
                    const existingInterest = DB.objects('Interest').filtered('name == $0', interestName)[0];
                    
                    if (existingInterest) {
                        // Agregar el interés al usuario si existe
                        existingUser.interests.push(existingInterest);
                    }
                });
            });
      
            // Actualizar el objeto de usuario después de escribir los cambios
            user = existingUser;
        }
      
        return user;
    },

    addUser: async ({ name, passwd, email, interestIds }) => {
        let user = null;

        // Comprobar si el usuario ya existe
        const existingUser = DB.objects('User').filtered('name == $0', name)[0];

        if (!existingUser) { // Si el usuario no existe, crear uno nuevo
            await DB.write(() => {
                user = DB.create('User', {name: name, passwd: passwd, _id: new Realm.BSON.ObjectId() , email: email});

                // Añadir intereses al usuario si se proporcionan
                if (interestIds && interestIds.length > 0) {
                    interestIds.forEach(interestId => {
                        const existingInterest = DB.objectForPrimaryKey('Interest', interestId);
                        if (existingInterest) {
                            user.interests.push(existingInterest);
                        }
                    });
                }
            });
        } else { // Si el usuario ya existe, devolver el usuario existente
            user = existingUser;
        }

        return user;
    },

    addInterest: ({ name }) => {
        let interest = null;
        // Comprobar si ya existe un interés con el mismo nombre
        const existingInterest = DB.objects('Interest').filtered('name == $0', name)[0];

        if (!existingInterest) { // Si el interés no existe, crear uno nuevo
            DB.write(() => {
                interest = DB.create('Interest', { name: name, _id: new Realm.BSON.ObjectId()  }); // No es necesario asignar el _id manualmente
                //interest._id =  Realm.BSON.ObjectId(); // Asignar el nuevo ObjectId como primaryKey
            });
        } else { // Si el interés ya existe, devolver el interés existente
            interest = existingInterest;
        }

        return interest;
    },

    addPost: ({ title, content, authorId, blogId }) => {
        let post = null;
        let blog = DB.objectForPrimaryKey('Blog', blogId);
        let auth = DB.objectForPrimaryKey('User', authorId);
        
        if (blog && auth) {
            let data = {
                title: title,
                content: content,
                author: auth,
                blog: blog,
                timestamp: new Date()
            };

            DB.write(() => { 
                post = DB.create('Post', data);
            });

            // SSE notification
            sse.emitter.emit('new-post', data);
        }

        return post;
    }
};

exports.root = rootValue;
exports.schema = schema;
exports.sse = sse;
