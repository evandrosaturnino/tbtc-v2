import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { execute } = deployments
  const { deployer } = await getNamedAccounts()

  // The headers come from 40 Bitcoin mainnet blocks in range 768076 to 768115
  // and are needed to prove the first Bitcoin epoch (381) after the genesis
  // epoch (380). This first retarget in `LightRelay` is needed to set the
  // previous and current epoch difficulties.
  const headers =
    "0x048000207b9401c8a93cca7f84a8b8581ea6ad1e0044f598fc48050000000000000000" +
    "006a4d2b727113ccba3fb734c0f1208f428b783d2eb097df59a8de109150ddd8a75552a0" +
    "633038081729a81a8c006001205921fa2f984d17fbcd977e99e6bcd58877e26776487403" +
    "000000000000000000a493bc40db99be0b102360176ffc67aeb8917090bf93bfb0a30603" +
    "ce1e9556d69f52a06330380817105f5f5e00e000201113b00390ab92c6413e0d4ec2b741" +
    "9d9e7047a0abaf0700000000000000000034d330ff05120c07152de162224b322dcda64e" +
    "8a018bf29b6c6fddc25991a0db9154a06330380817b419da3d04e0ff3fe15c89975fc717" +
    "3c0757543c382bbde70f17942cdc05020000000000000000002eef5923d64d7a6abba02f" +
    "a48395ee13cdcb47020526abee3fff2d4ec92fde0acb59a063303808170ae0ef54000060" +
    "20dbdb6b65829e449c7036ec6e01df85d262a002204937070000000000000000008cadaf" +
    "a5e74080b07a2b2ecbe6f50a8555a8fdc6a524c5bd888010df47a565e56262a063303808" +
    "170481b9010000e02047ecb7ed6e1b037d32143903611f23d257957fdf6b340500000000" +
    "0000000000eeb25ef7c6eaaa3b89275bc68c992a67e7595889c859abbfe2dff075b87ce6" +
    "357e63a063303808172291fd7704a0a628ee3633fbd87e252e110657e3af1228551a8af8" +
    "d2362b0100000000000000000019e5895d912135b94eb679352d0adb8b1ed137804d1f5a" +
    "fb6ebc3844417ffb4d5966a0633038081738cc1e4300400020d7744fcc18f37b4266574d" +
    "53cea9a95a12bbb8cbd95207000000000000000000558676dc836a0da76376ad69115031" +
    "575253ad16a07d849768192271916c7e511068a06330380817b14c513304006020bc0e8a" +
    "20301456a1f0ea13d61d2696814a9bf89ad4130500000000000000000097775f0f00af96" +
    "74616563471c71711e5d21f8eee6f3b90a3af0ee7b3656a1f65a68a063303808175fc00e" +
    "cc00002020e9908aae5d8d827d74ab6b14fbae2037e8c196713ec2010000000000000000" +
    "00d8dbdd64c4610f51ab93da688b618349feef3ec4fceb60806a49b673ee46038d6f68a0" +
    "6330380817681d617e00c03a294bbdebb6ffd3cce966cdcc75eb253dffc653137d9a9807" +
    "000000000000000000ce2d7c2e44652d82ea3e92d644f5cbbe426f53708a527eaa09e3bf" +
    "8e7aeda286e168a06330380817386074d40420b3234a0a21e0fc488200e28079e221abf0" +
    "1885b992d7adad000000000000000000007cd36eb9595ea17971f8417ec29749c6729b6a" +
    "dc19fed275a97203e62ea2d4b52d70a0633038081770c90b3500e0ff3715bf97e9dc9c1a" +
    "21983a711abe251733caf3296cfea003000000000000000000e9e47d8c11a05a31db0b1c" +
    "34bc9d06cccad3c56c91e71139dc90913d9c647f42f570a063303808174867c07e040071" +
    "316d5a670f16141ef66e4b81d22757d3adce55272cd639010000000000000000005ef579" +
    "ac4c962599d59f287972b5787f1bcbfd10dd4d91d55eb39c9bda52f0b12575a063303808" +
    "17603e71970060002094e7d56dc463b49f3566cee7409cf2cf09564c77ee250600000000" +
    "0000000000c22b23d9d1c385102b554c25a089cfcaa292ed5d0411d686f5d54f293684f1" +
    "8d3e77a06330380817c210254a0000e020d655bcbb673cc0f95a329c242ba505f44832c3" +
    "26c57f0300000000000000000007bbcfc84d28565dc4727fe24c462a3b67f16ed2bf2700" +
    "d83c674e7fb9bb9ff0b179a0633038081701256cc200e00020d83f702e8bd98191a165f9" +
    "ab76623c400cc86bf0ceed050000000000000000009db7cafcca7971fa21b4469350ef89" +
    "bfb02a0918ca6784a07f0eb02d07893622937ba06330380817275ce472000080201cde8d" +
    "500f8d45e5577a71ae32ca51e58deb04d4ab43070000000000000000001af9dc09004d08" +
    "57ac50bb53efa7afa46ae2362f409990ce83a8b8eba95df24ca17da063303808171c552e" +
    "1a04e0ff3f962d99d1b55bda58242cf7264121cd5dda3e7c23e104040000000000000000" +
    "0005100a22aec826a2a70c7ad3e5fb9d47eaddd0f5455a8ec2808fb68d510a4408127ea0" +
    "6330380817d5e8483f00800431a7731db0df5696d9a8c45b001ca9e0f59a0ac9e49e9b01" +
    "000000000000000000e6c77013d53ead67c0389877a04b9fee5118fc8692a5f5348853a0" +
    "2f0d77695e4a7fa063303808174c46ed4a0000602025f63077f95bfec0944643ba896f97" +
    "33200f815a525201000000000000000000a1b58dc8c037f5840da2ac5666214694baea82" +
    "49bf7c2ffc4492199e49752c13a480a06390f507178de119fa00e0362666e884e03c6a43" +
    "2eb74153f5fecf197c50fc324e78e004000000000000000000ea03b06d65c3d3f9280d54" +
    "9140f408005692e2e655050c6c1c23f3938e2256eb4986a06390f50717494cd88e000000" +
    "20e4db79e53a70db1cf15478f468ac7cea0fb5c4593e7200000000000000000000220157" +
    "bb6d9be47c6e0e86d265c15ab83622992b3d80668de2118579442b066a498da06390f507" +
    "1700c939de0020042ba111796d9b9bb0f6b4823692dd553d33401b733b0be00700000000" +
    "0000000000fa213371003531875c7c55045b747e40b3bc1a5fd6593667d540c755fb14ac" +
    "fc3d93a06390f5071703a4227e000000209900227794cd9070bb6d93d51f3ee8b2135b4a" +
    "f6b5e50600000000000000000037db066c45e7550387db75370ad2d1f3313a455787590a" +
    "40e084e3ee6743662fea95a06390f50717afeafe6c04401b2e4d0f977cd786300b0f4664" +
    "eab1c47040b0f8c3e6740e040000000000000000009e2f76bcf1b3692c48e933575521fd" +
    "bf1d5d385184823dcd92b8dea27bfb870b549ba06390f507171cc5fc0f0020002007b658" +
    "524aad00f174782ab83699b043d5358b27656106000000000000000000ebdaba52af764a" +
    "31f84302bcb544b4fd82fdb33533e01c98fc685854677a4244909ba06390f507177940da" +
    "6204200020c10e26bc114630b6d90915d744244c97816b971741f0010000000000000000" +
    "00c00a12d565e8f146b2b2a76918e76a6c89d7e136eaf2c75e6f0214a3df96b769749ca0" +
    "6390f507175f1b00250020012041c31f14f583f93ddd8e2308e0784398ddcd1360a58b07" +
    "00000000000000000075a57e4e79adb7c5dbae3b4c4500ed94f7d34a2f1c8dd07d07054e" +
    "0a1073e1aebe9ca06390f507175958878200605828f12c983c15b919c03089cf117cdc65" +
    "d865ae88a596e2020000000000000000005a2d55357c0846bfcf695343ab56c270ed1c4c" +
    "7c116177afd7dc929478b451bde29fa06390f5071744765e2d00801220ffbc53670b79fd" +
    "a367c6c925d1c2621fa22a42203fc501000000000000000000f0537fc7737c6940af5d17" +
    "eb388c40189d04d6eb0125ead3cbd092bef9fa590683a0a06390f50717666a1066040060" +
    "20de7f707e7f0910a44ab8d2e31a9644c70f85fbec4ad20000000000000000000044371c" +
    "0af4f1a8bbcd61ae8ef65ef4a31c934202d92b05fb0f752534f5352f023fa2a06390f507" +
    "177f2943b900c00c28b42b6d8f97ce6a82016fa4afd817ac4755cceacb3a100000000000" +
    "0000000000b9727dd5bcf2870b225edd881106822b1aa353c04e977dc98d119a9dc74dc9" +
    "e113a7a06390f507172c78994a00007c25e5d58a72ca5e3514bd9bdf48ef57a3e6fafcea" +
    "4bc44306000000000000000000ed4b8a5f8e44c9e2ad7d9690c80de3c064f1035255ae10" +
    "c5ae91cdec6ff44c518ca7a06390f50717212a2f6600a08b28d7a6ad25687cde3703a9d9" +
    "a0f0bee090bd6011fb9a6f040000000000000000007b3261cfb7bb9c78c89792556f1e21" +
    "b2dd7fc41299d5372d892f08e3fe2a20f7d9ada06390f5071737ef232b0400c020b5418d" +
    "62d0a19c2de1c96fefe82092339c44183bafa402000000000000000000ac6ae399a73436" +
    "3043026f008651a3cbc61f6f5cd387428d70638f89d1b86238e9aea06390f507174772b7" +
    "23000080200941f2c5fd01cc7dbee913617861ef759c56e9593939010000000000000000" +
    "000adb93b71075857413826d55078d633d7106f433e8e38bb36b428b7608cf539e3bb6a0" +
    "6390f507170444c90000004020fee3c940a2f19e5f04a57c668388ebfab54dbb8b4d3602" +
    "000000000000000000319cdaf0010646d09750bf4f7ffeee6a593e296145ca1529b90924" +
    "9a5f6bbf9ac5b8a06390f507176e386e800000a020662cdabd29bad13621fca6ee601ceb" +
    "6cea36a0c25fce00000000000000000000d46e68944e26294232b97110be78c2a9afe032" +
    "34e0baba2e23595e095d1948b9f6b8a06390f5071763ba125100e0ff3f5cb5f2e1e73b9b" +
    "a9382b47ce261e12c37b211e5a81b600000000000000000000b6bcda49736fb4a79f2b60" +
    "320904198cdd0f703cf25a4dcece27aafd6429a76916bfa06390f50717060b6d11"

  await execute(
    "LightRelay",
    { from: deployer, log: true, waitConfirmations: 1 },
    "retarget",
    headers
  )
}

export default func

func.tags = ["RetargetLightRelay"]
func.dependencies = ["LightRelay"]
