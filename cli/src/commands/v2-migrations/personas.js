import mongoose from 'mongoose';
import highland from 'highland';
import Persona from 'lib/models/persona';
import logger from 'lib/logger';
import { getConnection } from 'lib/connections/mongoose';
import { MongoClient } from 'mongodb';
import config from 'personas/dist/config';
import mongoModelsRepo from 'personas/dist/mongoModelsRepo';
import makePersonaService from 'personas/dist/service';
import { map } from 'bluebird';

const objectId = mongoose.Types.ObjectId;

const PersonaIdentifier =
  getConnection()
    .model(
      'personaidentifiers',
      new mongoose.Schema(),
      // 'personaidentifiers'
    );

const personaService = makePersonaService({
  repo: mongoModelsRepo({
    db: MongoClient.connect(
      process.env.MONGODB_PATH,
      config.mongoModelsRepo.options
    )
  })
});

const processIdentifier = async (identifier) => {
  // IDENTIFIER
  if (identifier.uniqueIdentifier.key.match(/account$/)) {
    await personaService.createIdentifier({
      organisation: identifier.organisation,
      ifi: {
        key: 'account',
        value: identifier.uniqueIdentifier.value
      },
      persona: identifier.persona.toString()
    });
  } else {
    let key;
    try {
      key = identifier.uniqueIdentifier.key.match(/\.([^\\.]+)$/)[1];
    } catch (err) {
      key = identifier.uniqueIdentifier.key;
    }
    await personaService.createIdentifier({
      organisation: identifier.organisation,
      ifi: {
        key,
        value: identifier.uniqueIdentifier.value
      },
      persona: identifier.persona.toString()
    });
  }

  // ATTRIBUTES
  await map(identifier.identifiers || [], ({ key, value }) =>
    personaService.overwritePersonaAttribute({
      personaId: identifier.persona.toString(),
      organisation: identifier.organisation.toString(),
      key,
      value
    })
  );

  // PERSONA
  const persona = await Persona.collection.findOne({
    organisation: objectId(identifier.organisation),
    _id: objectId(identifier.persona)
  });

  if (!persona) {
    // persona doesn't exist for some reason, create it
    await Persona.collection.insert({
      _id: objectId(identifier.persona),
      organisation: objectId(identifier.organisation),
    });
  } else {
    await Persona.collection.updateOne({
      _id: objectId(identifier.persona),
      organisation: objectId(identifier.organisation),
    }, {
      $unset: {
        personaIdentifiers: true
      }
    }, {
      upsert: false
    });
  }

  // REMOVE old identifier
  await PersonaIdentifier.collection.remove({
    _id: objectId(identifier._id),
    organisation: objectId(identifier.organisation)
  });
};

export default {
  up: async () => {
    const cursor = PersonaIdentifier
      .collection
      .find({});
    const totalToProccess = await PersonaIdentifier
      .collection
      .count({});

    let count = 0;

    await new Promise((resolve) => {
      highland(cursor)
        .map((identifier) => {
          if (count % 100 === 0) {
            logger.debug(`processed ${count} of ${totalToProccess}`);
          }
          count += 1;

          return highland(processIdentifier(identifier));
        })
        .parallel(4)
        // .series()
        .errors((err) => {
          console.log('err', err);
        })
        .done((err) => {
          console.log('done', err);
          resolve();
        });
    });
  },
  down: () => {
    throw new Error('Unimplemented');
  }
};
