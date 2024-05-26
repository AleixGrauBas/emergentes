//TODO:
//creacion unica de id con Realm.BSON.ObjectId() 

const Realm = require('realm')

//Ponemos la id de nuestra applicacion
const app = new Realm.App({ id: "futuro-en-juego-jqcne" })
let UserSchema = {
   name: 'User',
   primaryKey: '_id',
   
   properties: {
      _id: 'objectId',
      name: 'string',
      passwd: 'string',
      email: 'string',
      interests: {type: 'list', objectType: 'Interest'}
   }  
}

let InterestSchema = {
  name: 'Interest',
  primaryKey: '_id',
  properties: {
    name: 'string',
    _id: 'objectId'
  }
}

let ActividadSchema = {
  name: 'Actividad',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
     nombre: 'string',
     imagenes: 'string[]',
     ubicacion: 'Ubicacion',
     horarios: 'string[]',
     esPago: 'bool',
     enlaceGoogleMaps: 'string',
     inscripcionDisponible: 'bool'
  }
}

let UbicacionSchema = {
  name: 'Ubicacion',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
     lat: 'float',
     lng: 'float'
  }
}

let PostSchema = {
  name: 'Post',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    timestamp: 'date',
    title: 'string', 
    content: 'string',
    author: 'User',
    blog: 'Blog'
  }
}

let BlogSchema = {
  name : 'Blog',
  primaryKey: '_id',
  properties:{
    _id: 'objectId',
     title: 'string',
     creator: 'User' //esto es una referencia a un usuario
   }
}

// // // MODULE EXPORTS


let sync = {
  user: app.currentUser,
  flexible: true,
  initialSubscriptions: { //subconjunto de datos que se van a sincronizar
    update: (subs, realm) => {
      subs.add(realm.objects('User'),{name:"users"})
      subs.add(realm.objects('Post'),{name:"posts"})
      subs.add(realm.objects('Blog'),{name:"blogs"})
      subs.add(realm.objects('Interest'),{name:"interests"})
      subs.add(realm.objects('Actividad'),{name:"actividades"})
      subs.add(realm.objects('Ubicacion'),{name:"ubicaciones"})
    },
    rerunOnOpen: true //reabrir en caso de recarga
  }
}

let config = {
  path: './data/blogs.realm',
  sync: sync,
  schema: [PostSchema, UserSchema, BlogSchema,InterestSchema, ActividadSchema, UbicacionSchema]
}
exports.getDB = async () => {
  await app.logIn(new Realm.Credentials.anonymous())
  return await Realm.open(config)
}
  exports.app = app
  

exports.getDB = async () => await Realm.open(config)

// // // // // 

if (process.argv[1] == __filename){ //TESTING PART

  if (process.argv.includes("--create")){ //crear la BD

    app.logIn(Realm.Credentials.anonymous()).then(() => {

      Realm.deleteFile({path: './data/blogs.realm'}) //borramos base de datos si existe

      let DB = new Realm(config)
     
      DB.write(() => {
        let user = DB.create('User', {name:'user0', passwd:'xxx', _id: new Realm.BSON.ObjectId() , email: 'al394752'})

        console.log('Inserted objects', user)
      })
      DB.close()
    })
    .catch(err => console.log(err))
    //process.exit()
      
  }
  else { //consultar la BD

      Realm.open(config).then(DB => {
        let users = DB.objects('User')
        users.forEach(x => console.log(x.name))
        DB.close()
        process.exit()
      })
  }
}
