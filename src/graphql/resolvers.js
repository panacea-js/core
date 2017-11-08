const modelQuery = async function (model, parent, args) {
  const params = args.params || {
    limit: 100,
    sortBy: null,
    sortDirection: null
  }

  const sortOptions = {}

  if (params.sortBy) {
    sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1
  }

  const entities = await model.find().limit(params.limit).sort(sortOptions)

  return entities
}

export const graphQLResolvers = function () {
  return {
    Query: {
      cat: async (parent, args, models) => {
        const entity = await models.Cat.findById(args.id)
        return entity
      },

      dog: async (parent, args, models) => {
        const entity = await models.Dog.findById(args.id)
        return entity
      },

      cats: async (parent, args, models) => {
        const entity = await modelQuery(models.Cat, parent, args)
        return entity
      },

      dogs: async (parent, args, models) => {
        const entity = await modelQuery(models.Dog, parent, args)
        return entity
      }

    },
    Dog: {
      livesWithCats (dog, args, models) {
        let cats = []

        dog.livesWithCats.map(catId => {
          cats.push(models.Cat.findById(catId))
        })

        return cats
      }
    },
    Cat: {
      livesWithDogs (cat, args, models) {
        let dogs = []

        cat.livesWithDogs.map(dogId => {
          dogs.push(models.Dog.findById(dogId))
        })

        return dogs
      }
    },
    Mutation: {
      createCat: async (parent, args, { Cat }) => {
        const kitty = await new Cat(args.params).save()
        kitty._id = kitty._id.toString()
        return kitty
      },
      createDog: async (parent, args, { Dog }) => {
        const doggy = await new Dog(args.params).save()
        doggy._id = doggy._id.toString()
        return doggy
      }
    }
  }
}
