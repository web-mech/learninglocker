import { getConnection } from 'lib/connections/mongoose';
import mongoose from 'mongoose';
import { expect } from 'chai';
import personas from './personas';

const objectId = mongoose.Types.ObjectId;

describe('migrate personas', () => {
  const OldPersonaIdentifier = getConnection()
    .model('personaidentifiers', new mongoose.Schema(), 'personaidentifiers');

  const PersonaIdentifier = getConnection()
    .model('personaIdentifiers', new mongoose.Schema(), 'personaIdentifiers');

  const Persona = getConnection()
    .model('personas', new mongoose.Schema(), 'personas');

  const Attribute = getConnection()
    .model('personaAttributes', new mongoose.Schema(), 'personaAttributes');


  const cleanUp = async () => {
    OldPersonaIdentifier.collection.remove({});
    Persona.collection.remove({});
    Attribute.collection.remove({});
    PersonaIdentifier.collection.remove({});
  };

  beforeEach(cleanUp);

  // after(cleanUp);

  it('should migrate a persona', async () => {
    const personaId = objectId();
    const organisation = objectId();
    const identifierId1 = objectId();
    const identifierId2 = objectId();

    await Persona.collection.insert({
      _id: personaId,
      organisation,
      name: 'Dave',
      personaIdentifiers: [identifierId1, identifierId2]
    });

    await OldPersonaIdentifier.collection.insert({
      _id: identifierId1,
      persona: personaId,
      organisation,
      uniqueIdentifier: {
        key: 'statement.actor.account',
        value: {
          homePage: 'http://www.dave.com',
          name: 'dave21'
        }
      },
      identifiers: [
        {
          key: 'attributeKey1',
          value: 'attributeValue1'
        },
        {
          key: 'attributeKey2',
          value: 'attributeValue2'
        }
      ]
    });
    await OldPersonaIdentifier.collection.insert({
      _id: identifierId2,
      persona: personaId,
      organisation,
      uniqueIdentifier: {
        key: 'mbox',
        value: 'dave@dave.com'
      },
    });

    await personas.up();

    expect(await OldPersonaIdentifier.count()).to.equal(0);

    const persona = await Persona.collection.findOne({ _id: objectId(personaId) });
    expect(persona.name).to.equal('Dave');
    expect(persona.identifiers).to.equal(undefined);
    expect(await Persona.count()).to.equal(1);

    const identifier1Count = await PersonaIdentifier.collection.count({
      ifi: {
        key: 'account',
        value: {
          homePage: 'http://www.dave.com',
          name: 'dave21'
        }
      },
      persona: personaId,
      organisation,
    });
    expect(identifier1Count).to.equal(1);

    const identifier2Count = await PersonaIdentifier.collection.count({
      ifi: {
        key: 'mbox',
        value: 'dave@dave.com'
      },
      persona: personaId,
      organisation,
    });
    expect(identifier2Count).to.equal(1);

    expect(await Attribute.collection.count()).to.equal(2);
    expect((await Attribute.collection.findOne({
      personaId,
      key: 'attributeKey1'
    })).value).to.equal('attributeValue1');
    expect((await Attribute.collection.findOne({
      personaId,
      key: 'attributeKey2'
    })).value).to.equal('attributeValue2');
  });

  it.only('should migrate Devlin Peck', async () => {
    const personaId = objectId();
    const organisation = objectId();
    const identifierId = objectId();

    await Persona.collection.insert({
      _id: personaId,
      organisation,
      name: 'Devlin Peck',
      personaIdentifiers: [
        identifierId
      ]
    });

    await OldPersonaIdentifier.collection.insert({
      _id: identifierId,
      organisation,
      uniqueIdentifier: {
        key: 'statement.actor.mbox',
        value: 'mailto:devlinpeck@gmail.com'
      },
      identifiers: [
        {
          value: 'mailto:devlinpeck@gmail.com',
          key: 'statement.actor.mbox'
        },
        {
          value: 'devlin peck',
          key: 'statement.actor.name'
        },
        {
          value: '6007f19f-e4ca-48bb-b5e3-016e1913e799',
          key: 'statement.context.registration'
        }
      ],
      persona: personaId,
      personaScores: []
    });

    await personas.up();

    expect(await OldPersonaIdentifier.count()).to.equal(0);

    const persona = await Persona.collection.findOne({ _id: objectId(personaId) });
    expect(persona.name).to.equal('Devlin Peck');
    expect(persona.identifiers).to.equal(undefined);
    expect(await Persona.count()).to.equal(1);

    const identifierCount = await PersonaIdentifier.collection.count({
      ifi: {
        key: 'mbox',
        value: 'mailto:devlinpeck@gmail.com'
      },
      persona: personaId,
      organisation
    });
    expect(identifierCount).to.equal(1);

    expect(await Attribute.collection.count()).to.equal(3);
    expect((await Attribute.collection.findOne({
      personaId,
      key: 'statement.actor.mbox'
    })).value).to.equal('mailto:devlinpeck@gmail.com');
    expect((await Attribute.collection.findOne({
      personaId,
      key: 'statement.actor.name'
    })).value).to.equal('devlin peck');
    expect((await Attribute.collection.findOne({
      personaId,
      key: 'statement.context.registration'
    })).value).to.equal('6007f19f-e4ca-48bb-b5e3-016e1913e799');
  });
});
